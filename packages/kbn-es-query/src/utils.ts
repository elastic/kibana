/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';
import { DataViewFieldBase, IFieldSubTypeNested, IFieldSubTypeMulti } from './es_query';

/** @internal */
export function getTimeZoneFromSettings(dateFormatTZ: string) {
  const detectedTimezone = moment.tz.guess();

  return dateFormatTZ === 'Browser' ? detectedTimezone : dateFormatTZ;
}

type HasSubtype = Pick<DataViewFieldBase, 'subType'>;

export function isDataViewFieldSubtypeNested(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeNested;
  return !!subTypeNested?.nested?.path;
}

export function getDataViewFieldSubtypeNested(field: HasSubtype) {
  return isDataViewFieldSubtypeNested(field) ? (field.subType as IFieldSubTypeNested) : undefined;
}

export function isDataViewFieldSubtypeMulti(field: HasSubtype) {
  const subTypeNested = field?.subType as IFieldSubTypeMulti;
  return !!subTypeNested?.multi?.parent;
}

export function getDataViewFieldSubtypeMulti(field: HasSubtype) {
  return isDataViewFieldSubtypeMulti(field) ? (field.subType as IFieldSubTypeMulti) : undefined;
}

/**
 * Check whether the index expression represents a remote index (CCS) or not.
 * The index name is assumed to be individual index (no commas) but can contain `-`, wildcards,
 * datemath, remote cluster name and any other syntax permissible in index expression component.
 *
 * 2024/10/11 Implementation taken from https://github.com/smalyshev/elasticsearch/blob/main/server/src/main/java/org/elasticsearch/transport/RemoteClusterAware.java
 *
 * @param indexExpression
 */
export function isCCSRemoteIndexName(indexExpression: string): boolean {
  if (indexExpression === '' || indexExpression[0] === '<' || indexExpression.startsWith('-<')) {
    // This is date math, but even if it is not, the remote can't start with '<'.
    // Thus, whatever it is, this is definitely not a remote index.
    return false;
  }
  // Note remote index name also can not start with ':'
  return indexExpression.indexOf(':') > 0;
}
