/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactElement } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';
import { formatActivityMultiplier } from './activity_investigation_chat';

/** Places the series selector inside the same complete question sent to the chat. */
export const ActivityInvestigationQuestion = ({
  result: {
    actor,
    metricField,
    increase: { percentageChange },
  },
  subject,
}: {
  result: ActivityInvestigationResult;
  subject: ReactElement | string;
}): ReactElement => {
  const multiplier = percentageChange === null ? null : formatActivityMultiplier(percentageChange);
  if (metricField) {
    return multiplier === null ? (
      <FormattedMessage
        id="discover.activityInvestigation.sumWithoutBaselineQuestionDescription"
        defaultMessage="Why did the sum of {field} increase during this period?"
        values={{ field: subject }}
      />
    ) : (
      <FormattedMessage
        id="discover.activityInvestigation.sumMultiplierQuestionDescription"
        defaultMessage="Why is the sum of {field} {multiplier} times as much as before?"
        values={{ field: subject, multiplier }}
      />
    );
  }
  if (actor) {
    return multiplier === null ? (
      <FormattedMessage
        id="discover.activityInvestigation.actorWithoutBaselineQuestionDescription"
        defaultMessage="Why did activity for {actor} increase during this period?"
        values={{ actor: subject }}
      />
    ) : (
      <FormattedMessage
        id="discover.activityInvestigation.actorMultiplierQuestionDescription"
        defaultMessage="Why is there {multiplier} times as much activity for {actor} as before?"
        values={{ actor: subject, multiplier }}
      />
    );
  }
  return multiplier === null ? (
    <FormattedMessage
      id="discover.activityInvestigation.queryResultsWithoutBaselineQuestionDescription"
      defaultMessage="Why did activity in {queryResults} increase during this period?"
      values={{ queryResults: subject }}
    />
  ) : (
    <FormattedMessage
      id="discover.activityInvestigation.queryResultsMultiplierQuestionDescription"
      defaultMessage="Why is there {multiplier} times as much activity in {queryResults} as before?"
      values={{ queryResults: subject, multiplier }}
    />
  );
};
