/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

export const deserializer = t.string;
export type Deserializer = t.TypeOf<typeof deserializer>;
export const deserializerOrUndefined = t.union([deserializer, t.undefined]);
export type DeserializerOrUndefined = t.TypeOf<typeof deserializerOrUndefined>;
