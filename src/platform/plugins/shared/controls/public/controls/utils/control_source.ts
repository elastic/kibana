/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { DataControlState } from '@kbn/controls-schemas';
import { DataViewSource, EsqlSource } from '@kbn/data-source';
import type { DataSource } from '@kbn/data-source';
import { i18n } from '@kbn/i18n';
import { apiPublishesProjectRouting } from '@kbn/presentation-publishing';
import { coreServices, dataViewsService } from '../../services/kibana_services';

/** What a control reads its values from, as chosen by the user. */
export type ControlSourceDescriptor =
  | { readonly kind: 'dataView'; readonly dataViewId: string }
  | { readonly kind: 'esql'; readonly query: string };

type ControlSourceState = Partial<
  Pick<DataControlState, 'values_source' | 'data_view_id' | 'field_name' | 'esql_query'>
>;

/** What the user chose a control's values from: the source, and the field of a field control. */
export interface ValuesSourceSelection {
  readonly source: ControlSourceDescriptor;
  readonly fieldName?: string;
}

/** The source descriptor of a control state. */
export const toControlSourceDescriptor = ({
  values_source: valuesSource,
  data_view_id: dataViewId,
  esql_query: esqlQuery,
}: ControlSourceState): ControlSourceDescriptor =>
  valuesSource === ControlValuesSource.ESQL
    ? { kind: 'esql', query: esqlQuery ?? '' }
    : { kind: 'dataView', dataViewId: dataViewId ?? '' };

export const isSameControlSource = (
  a: ControlSourceDescriptor,
  b: ControlSourceDescriptor
): boolean =>
  a.kind === 'esql' && b.kind === 'esql'
    ? a.query === b.query
    : a.kind === 'dataView' && b.kind === 'dataView' && a.dataViewId === b.dataViewId;

export const toValuesSourceSelection = (state: ControlSourceState): ValuesSourceSelection => ({
  source: toControlSourceDescriptor(state),
  fieldName: state.values_source === ControlValuesSource.ESQL ? undefined : state.field_name,
});

export const isSameValuesSourceSelection = (
  a: ValuesSourceSelection,
  b: ValuesSourceSelection
): boolean => isSameControlSource(a.source, b.source) && a.fieldName === b.fieldName;

/** The data source a control reads its values from: a data view, or what an ES|QL query reads. */
export const resolveControlSource = async (
  descriptor: ControlSourceDescriptor,
  { parentApi }: { parentApi?: unknown } = {}
): Promise<DataSource> => {
  if (descriptor.kind === 'dataView') {
    return new DataViewSource(await dataViewsService.get(descriptor.dataViewId));
  }
  if (!descriptor.query) {
    throw new Error(
      i18n.translate('controls.dataControl.esqlMissingQuery', {
        defaultMessage: 'Variable control is missing a query',
      })
    );
  }
  return EsqlSource.forDataset({
    query: descriptor.query,
    http: coreServices.http,
    projectRouting: apiPublishesProjectRouting(parentApi)
      ? parentApi.projectRouting$.value
      : undefined,
  });
};
