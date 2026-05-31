/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { formatTriggerEventQueryError } from './workflow_execute_event_query_errors';
import {
  WorkflowExecuteUnifiedDataTable,
  type WorkflowExecuteUnifiedDataTableProps,
} from './workflow_execute_unified_data_table';

export type WorkflowExecuteEventFormSearchResultsProps = Omit<
  WorkflowExecuteUnifiedDataTableProps,
  'dataTestSubj' | 'fillHeight'
> & {
  isError: boolean;
  searchError: unknown;
  errors: string | null;
  triggerEventsSurfaceRef: React.Ref<HTMLDivElement>;
};

export const WorkflowExecuteEventFormSearchResults = memo(
  function WorkflowExecuteEventFormSearchResults({
    isError,
    searchError,
    errors,
    triggerEventsSurfaceRef,
    onDataGridFullScreenChange,
    ...tableProps
  }: WorkflowExecuteEventFormSearchResultsProps): React.JSX.Element {
    return (
      <WorkflowExecuteUnifiedDataTable
        {...tableProps}
        dataTestSubj="workflowTriggerEventsTable"
        surfaceRef={triggerEventsSurfaceRef}
        fillHeight={true}
        isError={isError}
        errorCalloutTitle={i18n.translate('workflows.workflowExecuteEventTriggerForm.errorTitle', {
          defaultMessage: 'Could not load trigger events',
        })}
        errorCalloutBody={formatTriggerEventQueryError(searchError)}
        validationError={errors}
        validationErrorTitle={i18n.translate(
          'workflows.workflowExecuteEventTriggerForm.executionPayloadErrorTitle',
          {
            defaultMessage: 'Fix the run payload before continuing',
          }
        )}
        onDataGridFullScreenChange={onDataGridFullScreenChange}
      />
    );
  }
);

WorkflowExecuteEventFormSearchResults.displayName = 'WorkflowExecuteEventFormSearchResults';
