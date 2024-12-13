/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EsqlControlType } from '@kbn/esql-validation-autocomplete';
import type { ISearchGeneric } from '@kbn/search-types';
import { monaco } from '@kbn/monaco';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { esqlVariablesService } from '../../../../common';
import type { ESQLControlState } from '../types';
import { IntervalControlForm } from './interval_control_form';
import { ValueControlForm } from './value_control_form';
import { FieldControlForm } from './field_control_form';
import { updateQueryStringWithVariable } from './helpers';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  dashboardApi: DashboardApi;
  panelId?: string;
  controlId?: string;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
  closeFlyout: () => void;
}

export function ESQLControlsFlyout({
  search,
  controlType,
  queryString,
  dashboardApi,
  panelId,
  controlId,
  cursorPosition,
  initialState,
  closeFlyout,
}: ESQLControlsFlyoutProps) {
  const controlGroupApi = useStateFromPublishingSubject(dashboardApi.controlGroupApi$);
  const dashboardPanels = useStateFromPublishingSubject(dashboardApi.children$);

  const addToESQLVariablesService = useCallback(
    (varName: string, variableValue: string, variableType: EsqlControlType, query: string) => {
      if (esqlVariablesService.variableExists(varName)) {
        esqlVariablesService.removeVariable(varName);
      }
      esqlVariablesService.addVariable({
        key: varName,
        value: variableValue,
        type: variableType,
      });
      esqlVariablesService.setEsqlQueryWithVariables(query);
    },
    []
  );

  const onCreateControl = useCallback(
    async (state: ESQLControlState, variableName: string, variableValue: string) => {
      // create a new control
      controlGroupApi?.addNewPanel({
        panelType: 'esqlControl',
        initialState: {
          ...state,
          id: uuidv4(),
        },
      });

      if (cursorPosition) {
        const query = updateQueryStringWithVariable(queryString, variableName, cursorPosition);
        addToESQLVariablesService(variableName, variableValue, controlType, query);
      }
      if (panelId) {
        // open the edit flyout to continue editing
        const embeddable = dashboardPanels[panelId];
        await (embeddable as { onEdit: () => Promise<void> }).onEdit();
      }
    },
    [
      addToESQLVariablesService,
      controlGroupApi,
      controlType,
      cursorPosition,
      dashboardPanels,
      panelId,
      queryString,
    ]
  );

  const onEditControl = useCallback(
    (state: ESQLControlState, variableName: string, variableValue: string) => {
      // edit an existing control
      if (controlId) {
        controlGroupApi?.replacePanel(controlId, {
          panelType: 'esqlControl',
          initialState: state,
        });
      }
      addToESQLVariablesService(variableName, variableValue, controlType, '');
    },
    [addToESQLVariablesService, controlGroupApi, controlId, controlType]
  );

  if (controlType === EsqlControlType.TIME_LITERAL) {
    return (
      <IntervalControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        dashboardApi={dashboardApi}
        initialState={initialState}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
      />
    );
  } else if (controlType === EsqlControlType.VALUES) {
    return (
      <ValueControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        dashboardApi={dashboardApi}
        initialState={initialState}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        search={search}
      />
    );
  } else if (controlType === EsqlControlType.FIELDS) {
    return (
      <FieldControlForm
        controlType={controlType}
        queryString={queryString}
        dashboardApi={dashboardApi}
        onCreateControl={onCreateControl}
        onEditControl={onEditControl}
        initialState={initialState}
        closeFlyout={closeFlyout}
        search={search}
      />
    );
  }

  return null;
}
