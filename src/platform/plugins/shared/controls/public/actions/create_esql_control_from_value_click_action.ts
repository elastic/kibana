/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isFilterableColumnSet } from '@kbn/chart-expressions-common';
import {
  ACTION_CREATE_ESQL_CONTROL_FROM_VALUE_CLICK,
  DEFAULT_ESQL_OPTIONS_LIST_STATE,
  ESQL_CONTROL,
} from '@kbn/controls-constants';
import {
  ESQLVariableType,
  EsqlControlType,
  apiCanUpdateESQLQuery,
  apiPublishesESQLVariables,
  type CanUpdateESQLQuery,
  type ESQLControlVariable,
} from '@kbn/esql-types';
import { appendToESQLQuery, escapeEsqlColumnName, getESQLQueryVariables } from '@kbn/esql-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  apiCanAddNewPanel,
  apiCanPinPanels,
  apiHasParentApi,
  type CanAddNewPanel,
  type CanPinPanels,
} from '@kbn/presentation-publishing';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';

interface ValueClickPoint {
  table: {
    columns: DatatableColumn[];
    rows: Array<Record<string, unknown>>;
    meta?: { type?: string };
  };
  column: number;
  row: number;
}

interface ValueClickContext {
  embeddable?: unknown;
  data: { data: ValueClickPoint[]; negate?: boolean };
}

interface ControlTarget {
  columnName: string;
  value: string;
  variableName: string;
}

interface ControlsParentApi extends CanAddNewPanel, Partial<CanPinPanels> {
  esqlVariables$: { value: ESQLControlVariable[] };
  getChildApi: (uuid: string) => Promise<unknown>;
}

const EXCLUDE_SUFFIX = '_exclude';

/** ES|QL variable names must be identifiers, so anything else in a column name is replaced. */
const toVariableName = (columnName: string, negate: boolean) => {
  const sanitized = columnName.replace(/[^A-Za-z0-9_]/g, '_');
  const identifier = /^[A-Za-z_]/.test(sanitized) ? sanitized : `_${sanitized}`;
  return negate ? `${identifier}${EXCLUDE_SUFFIX}` : identifier;
};

const getControlTargets = ({ data: { data, negate = false } }: ValueClickContext) =>
  data.flatMap(({ table, column: columnIndex, row: rowIndex }): ControlTarget[] => {
    const column = table.columns[columnIndex];
    const value = rowIndex > -1 ? table.rows[rowIndex]?.[column?.id] : undefined;
    const isRuntimeColumn =
      table.meta?.type === 'es_ql' &&
      column &&
      !column.meta?.sourceParams?.operationType &&
      !isFilterableColumnSet([column]);
    // Dates are skipped for now, and a null never matches `==`/`!=` against a control value
    if (!isRuntimeColumn || column.meta?.type === 'date' || value == null || Array.isArray(value)) {
      return [];
    }
    return [
      {
        columnName: column.name,
        value: String(value),
        variableName: toVariableName(column.name, negate),
      },
    ];
  });

const getParentApi = (embeddable: unknown): ControlsParentApi | undefined => {
  if (!apiHasParentApi(embeddable)) return undefined;
  const { parentApi } = embeddable;
  return apiCanAddNewPanel(parentApi) &&
    apiPublishesESQLVariables(parentApi) &&
    'getChildApi' in parentApi
    ? (parentApi as ControlsParentApi)
    : undefined;
};

const isSetSelectedOptions = (api: unknown): api is { setSelectedOptions: (o: string[]) => void } =>
  typeof (api as { setSelectedOptions?: unknown })?.setSelectedOptions === 'function';

/**
 * Columns created by the query itself can't be turned into a DSL filter. Instead, this action adds a
 * `WHERE column == ?variable` to the panel's query and creates (or updates) an ES|QL control for it.
 */
export const createESQLControlFromValueClickAction = (): ActionDefinition<ValueClickContext> => ({
  id: ACTION_CREATE_ESQL_CONTROL_FROM_VALUE_CLICK,
  type: ACTION_CREATE_ESQL_CONTROL_FROM_VALUE_CLICK,
  shouldAutoExecute: async () => true,
  getDisplayName: () =>
    i18n.translate('controls.esqlControl.fromValueClick.displayName', {
      defaultMessage: 'Filter with a variable control',
    }),
  isCompatible: async (context) => {
    const { embeddable } = context;
    return (
      apiCanUpdateESQLQuery(embeddable) &&
      embeddable.getEditableESQLQuery() !== undefined &&
      getParentApi(embeddable) !== undefined &&
      getControlTargets(context).length > 0
    );
  },
  execute: async (context) => {
    const { embeddable } = context;
    const parentApi = getParentApi(embeddable);
    const baseQuery = apiCanUpdateESQLQuery(embeddable)
      ? embeddable.getEditableESQLQuery()
      : undefined;
    if (!parentApi || baseQuery === undefined) throw new IncompatibleActionError();

    const negate = context.data.negate ?? false;
    let query = baseQuery;
    for (const { columnName, value, variableName } of getControlTargets(context)) {
      const existingVariable = parentApi.esqlVariables$.value.find(
        ({ key }) => key === variableName
      );

      if (!getESQLQueryVariables(query).includes(variableName)) {
        query = appendToESQLQuery(
          query,
          `| WHERE ${escapeEsqlColumnName(columnName)} ${negate ? '!=' : '=='} ?${variableName}`
        );
      }

      if (existingVariable) {
        const controlId = existingVariable.meta?.controlledBy;
        const controlApi = controlId ? await parentApi.getChildApi(controlId) : undefined;
        if (isSetSelectedOptions(controlApi)) controlApi.setSelectedOptions([value]);
        continue;
      }

      // the options are the distinct values of the column, as computed by the panel's own query
      const controlState: OptionsListESQLControlState = {
        ...DEFAULT_ESQL_OPTIONS_LIST_STATE,
        selected_options: [value],
        control_type: EsqlControlType.VALUES_FROM_QUERY,
        esql_query: appendToESQLQuery(baseQuery, `| STATS BY ${escapeEsqlColumnName(columnName)}`),
        variable_name: variableName,
        variable_type: ESQLVariableType.VALUES,
        title: negate ? `${columnName} (exclude)` : columnName,
      };
      const newControl = { panelType: ESQL_CONTROL, serializedState: controlState };
      await (apiCanPinPanels(parentApi) ? parentApi.addPinnedPanel : parentApi.addNewPanel)(
        newControl,
        { displaySuccessMessage: true }
      );
    }

    (embeddable as CanUpdateESQLQuery).updateESQLQuery(query);
  },
});
