/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { IncompatibleActionError, type Action } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  ESQLVariableType,
  type ESQLControlVariable,
  type ESQLControlState,
  apiPublishesESQLVariables,
} from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { ACTION_CREATE_ESQL_CONTROL } from '../constants';
import { openESQLControlFlyout } from '../../flyout';

function isESQLVariableType(value: string): value is ESQLVariableType {
  return Object.values(ESQLVariableType).includes(value as ESQLVariableType);
}

export function isActionCompatible(core: CoreStart, variableType: ESQLVariableType) {
  return core.uiSettings.get(ENABLE_ESQL) && isESQLVariableType(variableType);
}

interface ESQLControlTriggerContext {
  queryString: string;
  variableType: ESQLVariableType;
  esqlVariables: ESQLControlVariable[];
  onSaveControl?: (controlState: ESQLControlState, updatedQuery: string) => Promise<void>;
  onCancelControl?: () => void;
  cursorPosition?: monaco.Position;
  initialState?: ESQLControlState;
}
const isESQLControlTriggerContext = (context: unknown): context is ESQLControlTriggerContext =>
  Object.hasOwn(context as ESQLControlTriggerContext, 'variableType');

type Context = ESQLControlTriggerContext | EmbeddableApiContext;

export class CreateESQLControlAction implements Action<Context> {
  public type = ACTION_CREATE_ESQL_CONTROL;
  public id = ACTION_CREATE_ESQL_CONTROL;
  public order = 0;

  constructor(
    protected readonly core: CoreStart,
    protected readonly search: ISearchGeneric,
    protected readonly timefilter: TimefilterContract
  ) {}

  public getDisplayName(): string {
    return i18n.translate('esql.createESQLControlLabel', {
      defaultMessage: 'ES|QL control',
    });
  }

  public getIconType() {
    return 'controls';
  }

  public async isCompatible(context: Context) {
    if (isESQLControlTriggerContext(context))
      return isActionCompatible(this.core, context.variableType);
    return apiIsPresentationContainer(context.embeddable);
  }

  public async execute(context: Context) {
    if (isESQLControlTriggerContext(context)) {
      const { variableType } = context;

      if (!isActionCompatible(this.core, variableType)) {
        throw new IncompatibleActionError();
      }

      openESQLControlFlyout({
        ...context,
        core: this.core,
        search: this.search,
        timefilter: this.timefilter,
      });
    } else {
      const embeddable = apiIsPresentationContainer(context.embeddable) ? context.embeddable : null;
      if (!embeddable) throw new Error('Embeddable API unable to add new panel');

      const variablesInParent = apiPublishesESQLVariables(embeddable)
        ? embeddable.esqlVariables$.value
        : [];

      openESQLControlFlyout({
        core: this.core,
        search: this.search,
        timefilter: this.timefilter,
        queryString: '',
        variableType: ESQLVariableType.VALUES,
        esqlVariables: variablesInParent,
        onSaveControl: async (controlState: ESQLControlState) => {
          embeddable.addNewPanel({
            panelType: 'esqlControl',
            serializedState: {
              rawState: {
                ...controlState,
              },
            },
          });
        },
      });
    }
  }
}
