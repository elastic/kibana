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
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLVariableType, ESQLControlState } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { monaco } from '@kbn/monaco';
import { isActionCompatible, executeAction } from './esql_control_helpers';
import { ACTION_CREATE_ESQL_CONTROL } from '../constants';

interface Context {
  queryString: string;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}

export class CreateESQLControlAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CONTROL;
  public id = ACTION_CREATE_ESQL_CONTROL;
  public order = 50;

  constructor(
    protected readonly core: CoreStart,
    protected readonly search: ISearchGeneric,
    protected readonly timefilter: TimefilterContract
  ) {}

  public getDisplayName(): string {
    return i18n.translate('esql.createESQLControlLabel', {
      defaultMessage: 'Creates an ES|QL control',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ variableType }: Context) {
    return isActionCompatible(this.core, variableType);
  }

  public async execute({
    queryString,
    variableType,
    esqlVariables,
    onSaveControl,
    onCancelControl,
    cursorPosition,
    initialState,
  }: Context) {
    return executeAction({
      queryString,
      core: this.core,
      search: this.search,
      timefilter: this.timefilter,
      variableType,
      esqlVariables,
      onSaveControl,
      onCancelControl,
      cursorPosition,
      initialState,
    });
  }
}
