/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import {
  getControlPanelIdByFieldName,
  setWorkflowIdOnControlConfigs,
  updateWorkflowIdSelectedOptions,
} from './workflow_executions_filter_utils';
import { DEFAULT_EXECUTION_PAGE_FILTERS } from './workflow_executions_page_constants';

describe('workflow executions filter utils', () => {
  it('sets workflowId selected option on default controls', () => {
    const updatedControls = setWorkflowIdOnControlConfigs('wf-1');

    const workflowControl = updatedControls.find((control) => control.field_name === 'workflowId');
    expect(workflowControl?.selected_options).toEqual(['wf-1']);
  });

  it('updates existing workflowId selection', () => {
    const existingControls = DEFAULT_EXECUTION_PAGE_FILTERS.map((control) =>
      control.field_name === 'workflowId' ? { ...control, selected_options: ['wf-1'] } : control
    );
    const updatedControls = setWorkflowIdOnControlConfigs('wf-2', existingControls);

    const workflowControl = updatedControls.find((control) => control.field_name === 'workflowId');
    expect(workflowControl?.selected_options).toEqual(['wf-2']);
  });

  it('finds control panel id by field name', () => {
    const setSelectedOptions = jest.fn();
    const filterGroupHandler = {
      getInput: () => ({
        initialChildControlState: {
          '0': { field_name: 'status' },
          '1': { field_name: 'workflowId' },
        },
      }),
      children$: {
        getValue: () => ({
          '1': { setSelectedOptions },
        }),
      },
    } as unknown as FilterGroupHandler;

    expect(getControlPanelIdByFieldName('workflowId', filterGroupHandler)).toBe('1');
    updateWorkflowIdSelectedOptions('wf-123', filterGroupHandler);
    expect(setSelectedOptions).toHaveBeenCalledWith(['wf-123']);
  });
});
