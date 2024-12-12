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
import { esqlVariablesService } from '../../../../common';
import type { ESQLControlState } from '../types';
import { IntervalControlForm } from './interval_control_form';
import { ValueControlForm } from './value_control_form';
import { FieldControlForm } from './field_control_form';

interface ESQLControlsFlyoutProps {
  search: ISearchGeneric;
  controlType: EsqlControlType;
  queryString: string;
  dashboardApi: DashboardApi;
  panelId?: string;
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
  cursorPosition,
  initialState,
  closeFlyout,
}: ESQLControlsFlyoutProps) {
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

  if (controlType === EsqlControlType.TIME_LITERAL) {
    return (
      <IntervalControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        dashboardApi={dashboardApi}
        panelId={panelId}
        cursorPosition={cursorPosition}
        initialState={initialState}
        addToESQLVariablesService={addToESQLVariablesService}
      />
    );
  } else if (controlType === EsqlControlType.VALUES) {
    return (
      <ValueControlForm
        queryString={queryString}
        controlType={controlType}
        closeFlyout={closeFlyout}
        dashboardApi={dashboardApi}
        panelId={panelId}
        cursorPosition={cursorPosition}
        initialState={initialState}
        addToESQLVariablesService={addToESQLVariablesService}
        search={search}
      />
    );
  } else if (controlType === EsqlControlType.FIELDS) {
    return (
      <FieldControlForm
        controlType={controlType}
        queryString={queryString}
        dashboardApi={dashboardApi}
        panelId={panelId}
        cursorPosition={cursorPosition}
        initialState={initialState}
        closeFlyout={closeFlyout}
        addToESQLVariablesService={addToESQLVariablesService}
        search={search}
      />
    );
  }

  return null;
}
