/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { type Filter, type Query } from '@kbn/es-query';
/**
 * Builds an ES|QL query for the provided dataView.
 * If there is @timestamp field in the index, we don't add the WHERE clause.
 * If there is no @timestamp and there is a dataView timeFieldName, we add the WHERE clause with the timeFieldName.
 * If the index pattern contains TSDB fields, we add the TS command, otherwise we add the FROM command.
 * Two exceptions fall back to the FROM command, because a data view can mix TSDB and classic indices:
 * `*` and `<cluster>:*` match every index of a cluster, so TSDB field metadata there is not a
 * reliable signal of time series intent; and when the user has a query or filters, TS would restrict
 * the results to the TSDB indices, where the filtered fields may not exist.
 * When a timeFieldName exists, a SORT DESC clause on the dataView timeFieldName is appended.
 */
export declare function getInitialESQLQuery(
  dataView: DataView,
  query?: Query,
  filters?: Filter[]
): string;
