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
import type { AppDispatch } from '../../../entities/workflows/store/store';
import {
  selectExecution,
  selectExecutionRequest,
  selectStepExecutionPages,
  selectStepExecutionsTotal,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { loadExecutionThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_execution_thunk';

const truncatedTitle = i18n.translate(
  'workflows.workflowExecutionPanel.stepExecutionsTruncatedTitle',
  { defaultMessage: 'Step executions truncated' }
);

export interface StepExecutionsTruncatedCalloutProps {
  executionId: string;
  /** Step executions loaded into the tree; 0 means the skeleton or empty state owns the message. */
  loadedCount: number;
}

/**
 * Warns that the run has more step executions than the detail view loaded, and lets the user
 * pull the next page into the tree when the execution supports further pagination.
 */
export const StepExecutionsTruncatedCallout = React.memo<StepExecutionsTruncatedCalloutProps>(
  ({ executionId, loadedCount }) => {
    const stepExecutionsTotal = useSelector(selectStepExecutionsTotal);
    const execution = useSelector(selectExecution);
    const loadedPageCount = useSelector(selectStepExecutionPages).length;
    const dispatch = useDispatch<AppDispatch>();
    const request = useSelector(selectExecutionRequest);
    const isLoading = request?.id === executionId && request.loadMore;
    const isDisabled = request !== undefined;

    const omittedCount = getOmittedStepExecutionsCount(stepExecutionsTotal, loadedPageCount);
    const canShowMore =
      execution?.stepExecutionIds !== undefined ||
      loadedPageCount < WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT;
    const nextBatchCount = Math.min(WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE, omittedCount);

    const onShowMore = useCallback(() => {
      void dispatch(loadExecutionThunk({ id: executionId, loadMore: true }));
    }, [dispatch, executionId]);

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
                isLoading,
                isDisabled,
                'data-test-subj': 'workflowExecutionShowMoreStepExecutionsButton',
              },
            }
          : undefined,
      [canShowMore, nextBatchCount, onShowMore, isLoading, isDisabled]
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
