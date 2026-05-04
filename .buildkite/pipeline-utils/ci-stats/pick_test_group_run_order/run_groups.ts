/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildkiteClient } from '../../buildkite';
import type { RunGroup } from './types';

/**
 * Pick all run-groups for a given type from the ci-stats response, while
 * surfacing missing-duration and too-long warnings as Buildkite annotations.
 */
export function getRunGroups(
  bk: BuildkiteClient,
  allTypes: RunGroup[],
  typeName: string
): RunGroup[] {
  const types = allTypes.filter((t) => t.type === typeName);
  if (!types.length) {
    throw new Error(`missing test group run order for group [${typeName}]`);
  }

  annotateMissingDurations(bk, types, typeName);
  annotateTooLong(bk, types, typeName);

  return types;
}

/** Like `getRunGroups` but asserts there's exactly one matching group. */
export function getRunGroup(bk: BuildkiteClient, allTypes: RunGroup[], typeName: string): RunGroup {
  const groups = getRunGroups(bk, allTypes, typeName);
  if (groups.length !== 1) {
    throw new Error(`expected to find exactly 1 "${typeName}" run group`);
  }
  const defaultGroup = groups[0];
  defaultGroup.groups.forEach((g, i, a) => {
    g.title = `${typeName} tests ${i + 1}/${a.length}`;
  });
  return defaultGroup;
}

function annotateMissingDurations(bk: BuildkiteClient, types: RunGroup[], typeName: string): void {
  const misses = types.flatMap((t) => t.namesWithoutDurations);
  if (misses.length === 0) return;

  bk.setAnnotation(
    `test-group-missing-durations:${typeName}`,
    'warning',
    [
      `The following "${typeName}" configs don't have recorded times in ci-stats so the automatically-determined test groups might be a little unbalanced.`,
      `If these are new configs then this warning can be ignored as times will be reported soon.`,
      `The other possibility is that there aren't any tests in these configs, so times are never reported.`,
      `Empty test configs should be removed.`,
      '',
      ...misses.map((n) => ` - ${n}`),
    ].join('\n')
  );
}

function annotateTooLong(bk: BuildkiteClient, types: RunGroup[], typeName: string): void {
  const tooLongs = types.flatMap((t) => t.tooLong ?? []);
  if (tooLongs.length === 0) return;

  const uniqueTooLongMin = [
    ...new Set(
      types.map((t) => t.tooLongMin).filter((value): value is number => typeof value === 'number')
    ),
  ];
  const tooLongThresholdLabel =
    uniqueTooLongMin.length > 0
      ? `configured warning threshold${
          uniqueTooLongMin.length === 1 ? ` of ${uniqueTooLongMin[0]} minutes` : ''
        }`
      : 'maximum amount of time desired for a single CI job';

  bk.setAnnotation(
    `test-group-too-long:${typeName}`,
    'warning',
    [
      `The following "${typeName}" configs have durations that exceed the ${tooLongThresholdLabel}. ` +
        `This is not an error, and if you don't own any of these configs then you can ignore this warning. ` +
        `If you own any of these configs please split them up ASAP and ask Operations if you have questions about how to do that.`,
      '',
      ...tooLongs.map(({ config, durationMin }) => ` - ${config}: ${durationMin} minutes`),
    ].join('\n')
  );
}
