/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  getOmittedStepExecutionsCount,
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../common';
import {
  selectStepExecutionsPageCount,
  selectStepExecutionsTotal,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { showMoreStepExecutions } from '../../../entities/workflows/store/workflow_detail/slice';

const truncatedTitle = i18n.translate(
  'workflows.workflowExecutionPanel.stepExecutionsTruncatedTitle',
  { defaultMessage: 'Step executions truncated' }
);

export interface StepExecutionsTruncatedCalloutProps {
  /** Step executions loaded into the tree; 0 means the skeleton or empty state owns the message. */
  loadedCount: number;
}

/**
 * Warns that the run has more step executions than the detail view loaded, and lets the user
 * pull the next page into the tree until WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT is reached.
 */
export const StepExecutionsTruncatedCallout = React.memo<StepExecutionsTruncatedCalloutProps>(
  ({ loadedCount }) => {
    const dispatch = useDispatch();
    const stepExecutionsTotal = useSelector(selectStepExecutionsTotal);
    const stepExecutionsPageCount = useSelector(selectStepExecutionsPageCount);

    const omittedCount = getOmittedStepExecutionsCount(
      stepExecutionsTotal,
      stepExecutionsPageCount
    );
    const canShowMore = stepExecutionsPageCount < WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT;
    const nextBatchCount = Math.min(WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE, omittedCount);

    // The detail view feeds the page count into its poll key, so raising it triggers the refetch.
    const onShowMore = useCallback(() => {
      dispatch(showMoreStepExecutions());
    }, [dispatch]);

    const showMoreAction = useMemo(
      () =>
        canShowMore
          ? {
              primary: {
                children: i18n.translate(
                  'workflows.workflowExecutionPanel.showMoreStepExecutions',
                  {
                    defaultMessage: 'Show {count, number} more',
                    values: { count: nextBatchCount },
                  }
                ),
                onClick: onShowMore,
                'data-test-subj': 'workflowExecutionShowMoreStepExecutionsButton',
              },
            }
          : undefined,
      [canShowMore, nextBatchCount, onShowMore]
    );

    if (omittedCount === 0 || loadedCount === 0) {
      return null;
    }

    return (
      <>
        <KbnWarningCallout
          announceOnMount
          size="s"
          title={truncatedTitle}
          text={
            <FormattedMessage
              id="workflows.workflowExecutionPanel.stepExecutionsTruncatedDescription"
              defaultMessage="This execution has too much step data to load at once. {count, plural, one {# step execution was not loaded} other {# step executions were not loaded}}."
              values={{ count: omittedCount }}
            />
          }
          actionProps={showMoreAction}
          data-test-subj="workflowExecutionStepExecutionsTruncatedCallout"
        />
        <EuiSpacer size="m" />
      </>
    );
  }
);
StepExecutionsTruncatedCallout.displayName = 'StepExecutionsTruncatedCallout';
