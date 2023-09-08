/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializableRecord } from '@kbn/utility-types';
import { SerializableArray } from '@kbn/utility-types/src/serializable';

export type DefaultActionsSupportedValue = string[] | number[] | boolean[];

export type NonNullableSerializable =
  | string
  | number
  | boolean
  | SerializableArray
  | SerializableRecord;
