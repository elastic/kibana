/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** Interface to represent a reference field (allows to populate() content) */
export interface Ref {
  $id: string;
}

/** Fields that all kibana content must have (fields *not* editable by the user) */
export interface InternalFields {
  id: string;
  type: string;
  meta: {
    createdAt: string;
    createdBy: Ref;
    updatedAt: string;
    updatedBy: Ref;
  };
}

/** Fields that _all_ content must have (fields editable by the user) */
export interface CommonFields {
  title: string;
  description?: string;
}

/** Base type for all Kibana content */
export type KibanaContent<T extends object = {}> = InternalFields & CommonFields & T;
