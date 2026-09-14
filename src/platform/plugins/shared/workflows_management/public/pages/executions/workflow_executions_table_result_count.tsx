/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';

export interface WorkflowExecutionsTableResultCountProps {
  pageIndex: number;
  pageSize: number;
  pageItemCount: number;
  totalHits: number;
}

const formatCount = (value: number): string => value.toLocaleString();

export const WorkflowExecutionsTableResultCount =
  React.memo<WorkflowExecutionsTableResultCountProps>(
    ({ pageIndex, pageSize, pageItemCount, totalHits }) => {
      const isCapped = totalHits > WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW;
      const rangeStart = pageIndex * pageSize + 1;
      const rangeEnd = pageIndex * pageSize + pageItemCount;

      const countLabel = useMemo(() => {
        if (isCapped) {
          return i18n.translate('workflowsManagement.executionsPage.table.resultCountCapped', {
            defaultMessage: 'Showing {rangeStart}–{rangeEnd} of {maxResults}+ executions',
            values: {
              rangeStart: formatCount(rangeStart),
              rangeEnd: formatCount(rangeEnd),
              maxResults: formatCount(WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW),
            },
          });
        }

        return i18n.translate('workflowsManagement.executionsPage.table.resultCountExact', {
          defaultMessage: 'Showing {rangeStart}–{rangeEnd} of {totalHits} executions',
          values: {
            rangeStart: formatCount(rangeStart),
            rangeEnd: formatCount(rangeEnd),
            totalHits: formatCount(totalHits),
          },
        });
      }, [isCapped, rangeEnd, rangeStart, totalHits]);

      const limitTip = i18n.translate(
        'workflowsManagement.executionsPage.table.resultCountLimitTip',
        {
          defaultMessage:
            'Results are limited to the first {maxResults} executions. Refine your search or narrow the time range to see more.',
          values: { maxResults: formatCount(WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW) },
        }
      );

      return (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          data-test-subj="executionsTableResultCountGroup"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued" data-test-subj="executionsTableResultCount">
              {countLabel}
            </EuiText>
          </EuiFlexItem>
          {isCapped ? (
            <EuiFlexItem grow={false} data-test-subj="executionsTableLimitTip">
              <EuiIconTip type="info" size="s" color="subdued" content={limitTip} />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      );
    }
  );

WorkflowExecutionsTableResultCount.displayName = 'WorkflowExecutionsTableResultCount';
