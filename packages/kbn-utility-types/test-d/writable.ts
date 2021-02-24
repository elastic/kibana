/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectAssignable } from 'tsd';
import { Writable } from '../index';

type WritableArray = Writable<readonly string[]>;
expectAssignable<WritableArray>(['1']);

type WritableObject = Writable<{
  readonly name: string;
}>;
expectAssignable<WritableObject>({ name: '1' });
