/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { EsqlControlType } from '@kbn/esql-controls';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { monaco } from '@kbn/monaco';
const ACTION_CREATE_ESQL_CONTROL = 'ACTION_CREATE_ESQL_CONTROL';

// should move to one place
interface ESQLControlState {
  grow?: boolean;
  width?: string;
  title?: string;
  availableOptions: string[];
  selectedOptions: string[];
  variableName: string;
  variableType: string;
  esqlQuery?: string;
}

interface Context {
  queryString: string;
  controlType: EsqlControlType;
  dashboardApi: DashboardApi;
  panelId?: string;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export const getHelpersAsync = async () => await import('./esql_control_helpers');

export class CreateESQLControlAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CONTROL;
  public id = ACTION_CREATE_ESQL_CONTROL;
  public order = 50;

  constructor(
    protected readonly core: CoreStart,
    protected readonly uiActions: UiActionsStart,
    protected readonly search: ISearchGeneric
  ) {}

  public getDisplayName(): string {
    return i18n.translate('esql.createESQLControlLabel', {
      defaultMessage: 'Creates an ES|QL control',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ queryString }: Context) {
    const { isActionCompatible } = await getHelpersAsync();
    return isActionCompatible(queryString);
  }

  public async execute({
    queryString,
    controlType,
    dashboardApi,
    panelId,
    cursorPosition,
    initialState,
  }: Context) {
    const { executeAction } = await getHelpersAsync();
    return executeAction({
      queryString,
      core: this.core,
      uiActions: this.uiActions,
      search: this.search,
      controlType,
      dashboardApi,
      panelId,
      cursorPosition,
      initialState,
    });
  }
}
