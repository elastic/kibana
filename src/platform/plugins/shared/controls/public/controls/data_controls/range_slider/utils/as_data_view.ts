/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableSource } from '@kbn/data-source';

/**
 * A search source can only use a `DataView` as its index. A source is a `DataView` unless it is the
 * source of an ES|QL dataset, see `FilterableSource.kind`.
 */
export const asDataView = (source: FilterableSource | undefined): DataView | undefined =>
  source && !isEsqlFilterableSource(source) ? (source as DataView) : undefined;
