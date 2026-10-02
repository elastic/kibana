/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { castArray } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { getNamedParams } from '@kbn/esql-utils';
import {
  ACTIVITY_INVESTIGATION_AGENT_ID,
  ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
} from '../../../../../common/agent_builder';
import type {
  ActivityInvestigationAttachment,
  ActivityInvestigationSnapshot,
} from '../../../../../common/activity_investigation/attachment';
import type { ActivityIncrease } from '../../../../../common/activity_investigation/activity_increase';
import type { DiscoverServices } from '../../../../build_services';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';

const messages = {
  queryResults: (): string =>
    i18n.translate('discover.activityInvestigation.queryResultsLabel', {
      defaultMessage: 'The query results',
    }),
  actorIncrease: (actor: string, multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.actorMultiplierDropDownOptionLabel', {
      defaultMessage: '{actor} · {multiplier} times as much',
      values: { actor, multiplier },
    }),
  actorValue: (field: string, value: string): string =>
    i18n.translate('discover.activityInvestigation.actorValueLabel', {
      defaultMessage: '{field} = {value}',
      values: { field, value },
    }),
  missingActorValue: (field: string): string =>
    i18n.translate('discover.activityInvestigation.missingActorValueLabel', {
      defaultMessage: '{field} is missing',
      values: { field },
    }),
  zeroBaselineQuestion: (): string =>
    i18n.translate(
      'discover.activityInvestigation.queryResultsWithoutBaselineQuestionDescription',
      {
        defaultMessage: 'Why did activity in {queryResults} increase during this period?',
        values: { queryResults: messages.queryResults() },
      }
    ),
  increaseQuestion: (multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.queryResultsMultiplierQuestionDescription', {
      defaultMessage:
        'Why is there {multiplier} times as much activity in {queryResults} as before?',
      values: { multiplier, queryResults: messages.queryResults() },
    }),
  actorQuestion: (actor: string, multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.actorMultiplierQuestionDescription', {
      defaultMessage: 'Why is there {multiplier} times as much activity for {actor} as before?',
      values: { actor, multiplier },
    }),
  actorWithoutBaselineQuestion: (actor: string): string =>
    i18n.translate('discover.activityInvestigation.actorWithoutBaselineQuestionDescription', {
      defaultMessage: 'Why did activity for {actor} increase during this period?',
      values: { actor },
    }),
  sumLabel: (field: string): string =>
    i18n.translate('discover.activityInvestigation.sumLabel', {
      defaultMessage: 'Sum of {field}',
      values: { field },
    }),
  sumQuestion: (field: string, multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.sumMultiplierQuestionDescription', {
      defaultMessage: 'Why is the sum of {field} {multiplier} times as much as before?',
      values: { field, multiplier },
    }),
  sumWithoutBaselineQuestion: (field: string): string =>
    i18n.translate('discover.activityInvestigation.sumWithoutBaselineQuestionDescription', {
      defaultMessage: 'Why did the sum of {field} increase during this period?',
      values: { field },
    }),
  snapshotDescription: (): string =>
    i18n.translate('discover.activityInvestigation.frozenSnapshotDescription', {
      defaultMessage: 'Frozen Discover activity investigation',
    }),
} as const;

// Keep Discover from replacing the chat settings until the sidebar closes, even when switching chats.
export const activityInvestigationChatActive$ = new BehaviorSubject(false);

/** Formats the internal increase consistently for the inline question and chat. */
export const formatActivityMultiplier = (percentageChange: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), {
    maximumFractionDigits: 1,
  }).format(1 + percentageChange / 100);

const formatActor = ({
  field,
  value,
}: NonNullable<ActivityInvestigationResult['actor']>): string => {
  if (value === null) {
    return messages.missingActorValue(field);
  }

  return messages.actorValue(field, JSON.stringify(value) ?? String(value));
};

/** Names the selected series without repeating its increase or time interval. */
export const getActivityInvestigationSubject = ({
  actor,
  metricField,
}: ActivityInvestigationResult): string =>
  actor
    ? formatActor(actor)
    : metricField
    ? messages.sumLabel(metricField)
    : messages.queryResults();

/** Labels the selected measurement with its own multiplier, not the total's multiplier. */
export const getActivityInvestigationLabel = (result: ActivityInvestigationResult): string => {
  const label = getActivityInvestigationSubject(result);
  const { percentageChange } = result.increase;
  return percentageChange === null
    ? label
    : messages.actorIncrease(label, formatActivityMultiplier(percentageChange));
};

/** The question shown on the suggestion and sent verbatim to the agent, so the two cannot diverge. */
export const getActivityInvestigationQuestion = (
  { percentageChange }: ActivityIncrease,
  actor?: ActivityInvestigationResult['actor'],
  metricField?: string
): string => {
  if (metricField) {
    return percentageChange === null
      ? messages.sumWithoutBaselineQuestion(metricField)
      : messages.sumQuestion(metricField, formatActivityMultiplier(percentageChange));
  }
  if (actor) {
    return percentageChange === null
      ? messages.actorWithoutBaselineQuestion(formatActor(actor))
      : messages.actorQuestion(formatActor(actor), formatActivityMultiplier(percentageChange));
  }
  return percentageChange === null
    ? messages.zeroBaselineQuestion()
    : messages.increaseQuestion(formatActivityMultiplier(percentageChange));
};

const buildInvestigationSnapshot = ({
  context,
  request,
  asOfMs,
  metric,
  metricField,
  buckets,
  increase,
  actor,
}: ActivityInvestigationResult): ActivityInvestigationSnapshot => {
  const firstBucket = buckets[0];
  const lastBucket = buckets[buckets.length - 1];
  const isFieldMeasurement = increase.kind === 'contributor' || increase.kind === 'related_metric';
  if ((!firstBucket || !lastBucket) && !isFieldMeasurement) {
    throw new Error('Cannot build an activity investigation without complete buckets');
  }

  const increaseTimeRange = {
    from: new Date(increase.startTimeMs).toISOString(),
    to: new Date(increase.endTimeMs).toISOString(),
  };
  const increaseDurationMs = increase.endTimeMs - increase.startTimeMs;
  const { referenceTimeRange } = increase;
  if (!referenceTimeRange) {
    throw new Error('Cannot build an activity investigation without a reference window');
  }
  const comparisonTimeRange = {
    from: new Date(referenceTimeRange.startTimeMs).toISOString(),
    to: new Date(referenceTimeRange.endTimeMs).toISOString(),
  };
  const comparisonDurationMs = referenceTimeRange.endTimeMs - referenceTimeRange.startTimeMs;
  const scopeFilters = request.filter ? castArray(request.filter) : [];
  const createTimeFilter = ({
    from,
    to,
  }: ActivityInvestigationSnapshot['increase']['timeRange']): estypes.QueryDslQueryContainer => ({
    range: { [context.timeFieldName]: { gte: from, lt: to } },
  });
  const increaseTimeFilter = createTimeFilter(increaseTimeRange);

  return {
    actor,
    scope: {
      query: context.query.esql,
      indexPattern: context.indexPattern,
      timeFieldName: context.timeFieldName,
      timeRange: {
        from: new Date(context.timeRange.from).toISOString(),
        to: new Date(context.timeRange.to).toISOString(),
      },
      filter: request.filter,
      // Bind the original query, including variables used by commands omitted from the aggregation.
      params: getNamedParams(context.query.esql, context.timeRange, context.esqlVariables),
      variableTypes: context.esqlVariables.length
        ? Object.fromEntries(context.esqlVariables.map(({ key, type }) => [key, type]))
        : undefined,
      timeZone: request.timeZone,
      projectRouting: context.projectRouting,
    },
    asOf: new Date(asOfMs).toISOString(),
    metric,
    metricField,
    increase: {
      kind: increase.kind,
      pvalue: increase.pvalue,
      timeRange: increaseTimeRange,
      durationMs: increaseDurationMs,
      filter: { bool: { filter: [...scopeFilters, increaseTimeFilter] } },
      bucketCount: increase.bucketCount,
      baseline: increase.baseline,
      observedMean: increase.observedMean,
      observedTotal: increase.observedTotal,
      percentageChange: increase.percentageChange,
      trigger: increase.trigger,
      historicalComparison: increase.historicalComparison && {
        timeRange: {
          from: new Date(increase.historicalComparison.startTimeMs).toISOString(),
          to: new Date(increase.historicalComparison.endTimeMs).toISOString(),
        },
        observedTotal: increase.historicalComparison.observedTotal,
        daysAgo: increase.historicalComparison.daysAgo,
        score: increase.historicalComparison.score,
      },
      history: increase.history && {
        mode: increase.history.mode,
        spacing: increase.history.spacing,
        references: increase.history.references.map(({ startTimeMs, endTimeMs }) => ({
          from: new Date(startTimeMs).toISOString(),
          to: new Date(endTimeMs).toISOString(),
        })),
        expected: increase.history.expected,
        replicates: increase.history.replicates,
        version: increase.history.version,
      },
    },
    comparison: {
      timeRange: comparisonTimeRange,
      excludedTimeRange: increaseTimeRange,
      durationMs: comparisonDurationMs,
      filter: {
        bool: {
          filter: [...scopeFilters, createTimeFilter(comparisonTimeRange)],
          must_not: [increaseTimeFilter],
        },
      },
    },
    series:
      firstBucket && lastBucket
        ? {
            startTime: new Date(firstBucket.startTimeMs).toISOString(),
            endTime: new Date(lastBucket.endTimeMs).toISOString(),
            intervalMs: increase.intervalMs,
            counts: buckets.map(({ count }) => count),
          }
        : undefined,
  };
};

/** Opens a chat with the selected increase and its frozen snapshot. */
export const openActivityInvestigationChat = (
  result: ActivityInvestigationResult,
  { agentBuilder, core }: Pick<DiscoverServices, 'agentBuilder' | 'core'>
): void => {
  if (!agentBuilder || core.application.capabilities.agentBuilder?.show !== true) {
    return;
  }

  const sidebar = core.chrome.sidebar.getApp('agentBuilder');
  if (sidebar.isOpen() || activityInvestigationChatActive$.getValue()) {
    return;
  }

  // Agent Builder refreshes screen_context attachments on send; keep the frozen snapshot separate.
  const attachment: ActivityInvestigationAttachment = {
    id: ACTIVITY_INVESTIGATION_AGENT_ID,
    type: ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
    description: result.actor
      ? getActivityInvestigationLabel(result)
      : messages.snapshotDescription(),
    data: buildInvestigationSnapshot(result),
  };
  const question = getActivityInvestigationQuestion(
    result.increase,
    result.actor,
    result.metricField
  );

  const subscriptions = new Subscription();
  const release = () => subscriptions.unsubscribe();
  subscriptions.add(() => activityInvestigationChatActive$.next(false));
  activityInvestigationChatActive$.next(true);

  let opened = false;

  subscriptions.add(
    sidebar.isOpen$().subscribe((isOpen) => {
      if (isOpen) {
        opened = true;
      } else if (opened) {
        release();
      }
    })
  );

  try {
    agentBuilder.openChat({
      newConversation: true,
      sessionTag: ACTIVITY_INVESTIGATION_AGENT_ID,
      agentId: ACTIVITY_INVESTIGATION_AGENT_ID,
      initialMessage: question,
      autoSendInitialMessage: true,
      attachments: [attachment],
      browserApiTools: [],
      onClose: release,
    });
  } catch (error) {
    release();
    throw error;
  }
};
