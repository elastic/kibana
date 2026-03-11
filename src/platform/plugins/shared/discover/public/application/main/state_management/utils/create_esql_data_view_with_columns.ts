/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { enrichDataViewSpecWithEsqlColumns } from '@kbn/data-view-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';

export interface CreateEsqlDataViewDeps {
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
}

/**
 * Creates a clone of the base DataView enriched with fields derived from ES|QL query columns.
 * This clone is not persisted or cached in the DataViewsService.
 *
 * @param baseDataView - The original DataView to clone
 * @param esqlQueryColumns - The columns returned from the ES|QL query response
 * @param deps - Dependencies required to construct the DataView
 * @returns A new DataView instance with fields from esqlQueryColumns
 */
export function createEsqlDataViewWithColumns(
  baseDataView: DataView,
  esqlQueryColumns: DatatableColumn[],
  deps: CreateEsqlDataViewDeps
): DataView {
  const baseSpec = baseDataView.toSpec(false);
  const enrichedSpec = enrichDataViewSpecWithEsqlColumns(baseSpec, esqlQueryColumns);

  return new DataView({
    spec: enrichedSpec,
    fieldFormats: deps.fieldFormats,
    shortDotsEnable: deps.shortDotsEnable,
    metaFields: deps.metaFields,
  });
}
