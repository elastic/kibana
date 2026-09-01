/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterGroupHandler } from '@kbn/alerts-ui-shared';
import type { FilterControlConfig } from '@kbn/alerts-ui-shared/src/alert_filter_controls/types';
import type { OptionsListControlApi } from '@kbn/controls-plugin/public/controls/data_controls/options_list_control/types';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { Writable } from '@kbn/utility-types';
import { DEFAULT_EXECUTION_PAGE_FILTERS } from './workflow_executions_page_constants';

export const WORKFLOW_ID_FILTER_FIELD = 'workflowId';

export const getControlPanelIdByFieldName = (
  fieldName: string,
  filterGroupHandler?: FilterGroupHandler
): string | undefined => {
  if (!filterGroupHandler) {
    return undefined;
  }

  const childControlState = filterGroupHandler.getInput().initialChildControlState;
  return Object.entries(childControlState).find(
    ([, panel]) => (panel as OptionsListDSLControlState).field_name === fieldName
  )?.[0];
};

export const setWorkflowIdOnControlConfigs = (
  workflowId: string,
  controlConfigs?: Writable<FilterControlConfig>[]
): FilterControlConfig[] => {
  const updatedControlConfigs = controlConfigs
    ? [...controlConfigs]
    : ([...DEFAULT_EXECUTION_PAGE_FILTERS] as Writable<FilterControlConfig>[]);

  const workflowControl = updatedControlConfigs.find(
    (control) => control.field_name === WORKFLOW_ID_FILTER_FIELD
  );

  if (workflowControl) {
    workflowControl.selected_options = [workflowId];
    workflowControl.exists_selected = false;
    workflowControl.exclude = false;
  }

  return updatedControlConfigs;
};

export const updateWorkflowIdSelectedOptions = (
  workflowId: string,
  filterGroupHandler?: FilterGroupHandler
) => {
  const panelId = getControlPanelIdByFieldName(WORKFLOW_ID_FILTER_FIELD, filterGroupHandler);
  if (!panelId || !filterGroupHandler) {
    return;
  }

  const controlApi = filterGroupHandler.children$.getValue()[
    panelId
  ] as Partial<OptionsListControlApi>;

  controlApi?.setSelectedOptions?.([workflowId]);
};
