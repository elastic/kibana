/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { isEsqlResultsResult, type ToolResult } from '@kbn/agent-builder-common/tools';
import { createErrorResult, createOtherResult, toHashedId } from '@kbn/agent-builder-server';
import type { BuiltinAttachmentBoundedTool } from '@kbn/agent-builder-server/attachments';
import type { ActivityInvestigationSnapshot } from '../../common/activity_investigation/attachment';

export const MAX_ACTIVITY_COMPARISON_GROUPS = 20;

const MS_PER_HOUR = 3_600_000;
const nameSchema = z.string().min(1).max(256);
const groupValueSchema = z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()]);
const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const comparisonSchema = z.object({
  increaseResultId: nameSchema.describe('tool_result_id of the increase-window ES|QL counts'),
  comparisonResultId: nameSchema.describe(
    'tool_result_id of one comparison-window STATS row with a conditional COUNT(*) column per candidate, without BY'
  ),
  groupColumn: nameSchema.describe('The grouping column in the increase result'),
  countColumn: nameSchema.describe('The COUNT(*) column in the increase result'),
  comparisonColumns: z
    .array(z.object({ value: groupValueSchema, countColumn: nameSchema }))
    .min(1)
    .max(MAX_ACTIVITY_COMPARISON_GROUPS)
    .describe(
      'Map every increase-result group value to its executed conditional count column in the comparison result; preserve value types, including null'
    ),
});
const countRowSchema = z.tuple([groupValueSchema, countSchema]);
type GroupValue = z.infer<typeof countRowSchema>[0];
type ComparisonColumns = z.infer<typeof comparisonSchema>['comparisonColumns'];

interface CandidateCounts {
  value: GroupValue;
  increaseCount: number;
  comparisonCount: number;
}

const errors = {
  missingResults: 'Use separate executed ES|QL results for the two windows.',
  invalidCandidates: `Use non-empty ES|QL counts with at most ${MAX_ACTIVITY_COMPARISON_GROUPS} unique scalar groups and safe non-negative integer counts. Check the column names.`,
  incompleteComparison:
    'Count every increase-result candidate explicitly in the comparison window. Use one STATS row with a separate COUNT(*) WHERE predicate column for each value, without BY, and map every value to a unique count column. Counts must include measured zeros; do not pass a second top-values list or invent zero counts.',
} as const;

const readIncreaseCounts = (
  result: ToolResult,
  groupColumn: string,
  countColumn: string
): Map<GroupValue, number> | undefined => {
  if (
    !isEsqlResultsResult(result) ||
    result.data.values.length === 0 ||
    result.data.values.length > MAX_ACTIVITY_COMPARISON_GROUPS
  ) {
    return;
  }
  const { columns, values } = result.data;
  const groupIndex = columns.findIndex(({ name }) => name === groupColumn);
  const countIndex = columns.findIndex(({ name }) => name === countColumn);
  if (groupIndex < 0 || countIndex < 0 || groupIndex === countIndex) return;

  const counts = new Map<GroupValue, number>();
  for (const row of values) {
    const parsed = countRowSchema.safeParse([row[groupIndex], row[countIndex]]);
    if (!parsed.success || counts.has(parsed.data[0])) return;
    const [value, count] = parsed.data;
    counts.set(value, count);
  }
  return counts;
};

const readComparisonCounts = (
  result: ToolResult,
  comparisonColumns: ComparisonColumns,
  increaseCounts: ReadonlyMap<GroupValue, number>
): CandidateCounts[] | undefined => {
  if (
    !isEsqlResultsResult(result) ||
    result.data.values.length !== 1 ||
    comparisonColumns.length !== increaseCounts.size
  ) {
    return;
  }
  const { columns, values } = result.data;
  const seenValues = new Set<GroupValue>();
  const seenColumns = new Set<string>();
  const counts: CandidateCounts[] = [];
  for (const { value, countColumn } of comparisonColumns) {
    const increaseCount = increaseCounts.get(value);
    const columnIndex = columns.findIndex(({ name }) => name === countColumn);
    const comparisonCount = countSchema.safeParse(values[0][columnIndex]);
    if (
      increaseCount === undefined ||
      seenValues.has(value) ||
      seenColumns.has(countColumn) ||
      !comparisonCount.success
    ) {
      return;
    }
    seenValues.add(value);
    seenColumns.add(countColumn);
    counts.push({ value, increaseCount, comparisonCount: comparisonCount.data });
  }
  return counts;
};

/** Compares returned counts using the attachment's durations, without another search or model call. */
export const createActivityInvestigationComparisonTool = (
  attachmentId: string,
  { increase, comparison }: ActivityInvestigationSnapshot
): BuiltinAttachmentBoundedTool<typeof comparisonSchema> => ({
  id: `discover_activity_compare_${toHashedId(attachmentId)}`,
  type: ToolType.builtin,
  description: `Compare candidate counts for activity investigation attachment ${attachmentId}. Pass increase-window grouped counts and one comparison-window conditional STATS row counting exactly those values, including zeros. Use this attachment's increase.filter and comparison.filter respectively. comparisonColumns maps every original group value to its executed reference count column. Missing candidates are rejected, not silently skipped or treated as zero. Calculates per-hour rates, added rate and rate ratio from stored results and frozen durations. Does not verify query scope or prove causation.`,
  schema: comparisonSchema,
  handler: (
    { increaseResultId, comparisonResultId, groupColumn, countColumn, comparisonColumns },
    { resultStore }
  ) => {
    if (
      increaseResultId === comparisonResultId ||
      !resultStore.has(increaseResultId) ||
      !resultStore.has(comparisonResultId)
    ) {
      return {
        results: [createErrorResult(errors.missingResults)],
      };
    }
    const increaseCounts = readIncreaseCounts(
      resultStore.get(increaseResultId),
      groupColumn,
      countColumn
    );
    if (!increaseCounts) {
      return { results: [createErrorResult(errors.invalidCandidates)] };
    }
    const counts = readComparisonCounts(
      resultStore.get(comparisonResultId),
      comparisonColumns,
      increaseCounts
    );
    if (!counts) {
      return { results: [createErrorResult(errors.incompleteComparison)] };
    }

    const groups = counts.map(({ value, increaseCount, comparisonCount }) => {
      const increaseRate = (increaseCount * MS_PER_HOUR) / increase.durationMs;
      const comparisonRate = (comparisonCount * MS_PER_HOUR) / comparison.durationMs;
      return {
        value,
        increaseCount,
        comparisonCount,
        increaseRatePerHour: increaseRate,
        comparisonRatePerHour: comparisonRate,
        addedRatePerHour: increaseRate - comparisonRate,
        rateRatio: comparisonCount === 0 ? null : increaseRate / comparisonRate,
      };
    });

    return {
      results: [
        createOtherResult({
          groupColumn,
          coverage: 'selected-candidates-only',
          groups: groups.sort((left, right) => right.addedRatePerHour - left.addedRatePerHour),
        }),
      ],
    };
  },
});
