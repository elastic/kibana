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
import { ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE } from '../../../../../common/agent_builder';
import type {
  ActivityInvestigationAttachment,
  ActivityInvestigationSnapshot,
} from '../../../../../common/activity_investigation/attachment';
import type { ActivityIncrease } from '../../../../../common/activity_investigation/activity_increase';
import type { DiscoverServices } from '../../../../build_services';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';

const INVESTIGATION_ID = 'discover-activity-investigation';

const messages = {
  allActivity: (): string =>
    i18n.translate('discover.activityInvestigation.allActivityLabel', {
      defaultMessage: 'All activity',
    }),
  actorIncrease: (actor: string, multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.actorMultiplierDropDownOptionLabel', {
      defaultMessage: '{actor} · {multiplier} times as much',
      values: { actor, multiplier },
    }),
  zeroBaselineQuestion: (): string =>
    i18n.translate('discover.activityInvestigation.increaseWithoutBaselineQuestionButtonLabel', {
      defaultMessage: 'Why did activity increase during this period?',
    }),
  increaseQuestion: (multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.multiplierIncreaseQuestionButtonLabel', {
      defaultMessage: 'Why is there {multiplier} times as much activity as before?',
      values: { multiplier },
    }),
  actorQuestion: (actor: string, multiplier: string): string =>
    i18n.translate('discover.activityInvestigation.actorMultiplierQuestionButtonLabel', {
      defaultMessage: 'Why is there {multiplier} times as much activity for {actor} as before?',
      values: { actor, multiplier },
    }),
  actorWithoutBaselineQuestion: (actor: string): string =>
    i18n.translate('discover.activityInvestigation.actorWithoutBaselineQuestionButtonLabel', {
      defaultMessage: 'Why did activity for {actor} increase during this period?',
      values: { actor },
    }),
  snapshotDescription: (): string =>
    i18n.translate('discover.activityInvestigation.frozenSnapshotDescription', {
      defaultMessage: 'Frozen Discover activity investigation',
    }),
} as const;

// Keep Discover from replacing the chat settings until the sidebar closes, even when switching chats.
export const activityInvestigationChatActive$ = new BehaviorSubject(false);

const formatMultiplier = (percentageChange: number): string =>
  new Intl.NumberFormat(i18n.getLocale(), {
    maximumFractionDigits: 1,
  }).format(1 + percentageChange / 100);

const formatActor = ({ field, value }: NonNullable<ActivityInvestigationResult['actor']>): string =>
  `${field} = ${JSON.stringify(value)}`;

/** Labels a detected actor with its own multiplier, without combining separate results. */
export const getActivityInvestigationLabel = ({
  actor,
  increase: { percentageChange },
}: ActivityInvestigationResult): string => {
  const label = actor ? formatActor(actor) : messages.allActivity();
  return percentageChange === null
    ? label
    : messages.actorIncrease(label, formatMultiplier(percentageChange));
};

/** The question shown on the suggestion and sent verbatim to the agent, so the two cannot diverge. */
export const getActivityInvestigationQuestion = (
  { percentageChange }: ActivityIncrease,
  actor?: ActivityInvestigationResult['actor']
): string => {
  if (actor) {
    return percentageChange === null
      ? messages.actorWithoutBaselineQuestion(formatActor(actor))
      : messages.actorQuestion(formatActor(actor), formatMultiplier(percentageChange));
  }
  return percentageChange === null
    ? messages.zeroBaselineQuestion()
    : messages.increaseQuestion(formatMultiplier(percentageChange));
};

const buildInvestigationSnapshot = ({
  context,
  request,
  asOfMs,
  metric,
  buckets,
  increase,
  actor,
}: ActivityInvestigationResult): ActivityInvestigationSnapshot => {
  const firstBucket = buckets[0];
  const lastBucket = buckets[buckets.length - 1];
  if (!firstBucket || !lastBucket) {
    throw new Error('Cannot build an activity investigation without complete buckets');
  }

  const seriesTimeRange = {
    from: new Date(firstBucket.startTimeMs).toISOString(),
    to: new Date(lastBucket.endTimeMs).toISOString(),
  };
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
    series: {
      startTime: seriesTimeRange.from,
      endTime: seriesTimeRange.to,
      intervalMs: increase.intervalMs,
      counts: buckets.map(({ count }) => count),
    },
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
    id: INVESTIGATION_ID,
    type: ACTIVITY_INVESTIGATION_ATTACHMENT_TYPE,
    description: result.actor
      ? getActivityInvestigationLabel(result)
      : messages.snapshotDescription(),
    data: buildInvestigationSnapshot(result),
  };
  const question = getActivityInvestigationQuestion(result.increase, result.actor);

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
      sessionTag: INVESTIGATION_ID,
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
