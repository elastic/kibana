/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlValuesSource } from '@kbn/controls-constants';
import type { FilterableSource } from '@kbn/data-source';
import type { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { dataViewsService } from '../../services/kibana_services';
import { getSourceFromESQLQuery } from './get_source_from_esql_query';

export interface FieldSourceKey {
  valuesSource: ControlValuesSource.FIELD;
  dataViewId?: string;
}
export interface EsqlSourceKey {
  valuesSource: ControlValuesSource.ESQL;
  esqlQuery: string;
}
/** What identifies the source of a control: a data view for a field, the query for a "Write a query" control */
export type ControlSourceKey = FieldSourceKey | EsqlSourceKey;

interface Options {
  parentApi?: unknown;
}

/** The source that a control reads its values from, whatever the kind of the source is. */
export async function resolveControlSource(
  key: FieldSourceKey,
  options?: Options
): Promise<DataView>;
export async function resolveControlSource(
  key: ControlSourceKey,
  options?: Options
): Promise<FilterableSource>;
export async function resolveControlSource(
  key: ControlSourceKey,
  { parentApi }: Options = {}
): Promise<FilterableSource> {
  if (key.valuesSource !== ControlValuesSource.ESQL) {
    return dataViewsService.get(key.dataViewId ?? '');
  }

  if (!key.esqlQuery) {
    throw new Error(
      i18n.translate('controls.dataControl.esqlMissingQuery', {
        defaultMessage: 'Variable control is missing a query',
      })
    );
  }
  const source = await getSourceFromESQLQuery(key.esqlQuery, { parentApi });
  if (!source.id) {
    throw new Error(
      i18n.translate('controls.dataControl.esqlDataViewDeriveFailed', {
        defaultMessage: 'Could not derive a data view from the ES|QL query',
      })
    );
  }
  return source;
}
