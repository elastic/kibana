/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppHeaderBadge } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type {
  CalledWorkflowImpact,
  DependentsAnalysis,
} from '../../../../common/lib/workflow_dependents/types';

/** Header badge that shows how many workflows call this one and opens the callers flyout. */
export const getDependentsBadge = ({
  analysis,
  onClick,
}: {
  analysis?: DependentsAnalysis;
  onClick: () => void;
}): AppHeaderBadge | undefined => {
  if (!analysis || analysis.summary.direct === 0) {
    return undefined;
  }
  const { direct } = analysis.summary;
  return {
    onClick,
    onClickAriaLabel: i18n.translate('workflows.dependents.badge.ariaLabel', {
      defaultMessage: 'Show the workflows that call this one and how your changes affect them',
    }),
    'data-test-subj': 'workflowDependentsBadge',
    color: 'hollow',
    label: i18n.translate('workflows.dependents.badge.usedBy', {
      defaultMessage: 'Used by {direct} {direct, plural, one {workflow} other {workflows}}',
      values: { direct },
    }),
  };
};

/** Header badge that shows how many workflows this one runs and opens the flyout on that tab. */
export const getCalledWorkflowsBadge = ({
  calledWorkflows,
  onClick,
}: {
  calledWorkflows?: readonly CalledWorkflowImpact[];
  onClick: () => void;
}): AppHeaderBadge | undefined => {
  const count = calledWorkflows?.length ?? 0;
  if (count === 0) {
    return undefined;
  }
  return {
    onClick,
    onClickAriaLabel: i18n.translate('workflows.dependents.calledBadge.ariaLabel', {
      defaultMessage: 'Show the workflows this one runs and whether each call works',
    }),
    'data-test-subj': 'workflowCalledBadge',
    color: 'hollow',
    label: i18n.translate('workflows.dependents.calledBadge.label', {
      defaultMessage: 'Runs {count} {count, plural, one {workflow} other {workflows}}',
      values: { count },
    }),
  };
};
