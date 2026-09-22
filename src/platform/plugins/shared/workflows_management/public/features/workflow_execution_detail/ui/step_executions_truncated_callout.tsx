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
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import {
  getOmittedStepExecutionsCount,
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../common';
import {
  selectStepExecutionPages,
  selectStepExecutionsTotal,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { loadMoreStepExecutionsThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_more_step_executions_thunk';
import { useAsyncThunkState } from '../../../hooks/use_async_thunk';

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
 * pull the next page into the tree until WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT is reached.
 */
export const StepExecutionsTruncatedCallout = React.memo<StepExecutionsTruncatedCalloutProps>(
  ({ executionId, loadedCount }) => {
    const stepExecutionsTotal = useSelector(selectStepExecutionsTotal);
    const loadedPageCount = useSelector(selectStepExecutionPages).length;
    const [loadMore, { isLoading }] = useAsyncThunkState(loadMoreStepExecutionsThunk);

    const omittedCount = getOmittedStepExecutionsCount(stepExecutionsTotal, loadedPageCount);
    const canShowMore = loadedPageCount < WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT;
    const nextBatchCount = Math.min(WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE, omittedCount);

    const onShowMore = useCallback(() => {
      loadMore({ id: executionId });
    }, [loadMore, executionId]);

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
                'data-test-subj': 'workflowExecutionShowMoreStepExecutionsButton',
              },
            }
          : undefined,
      [canShowMore, nextBatchCount, onShowMore, isLoading]
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
