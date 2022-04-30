/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectAssignable } from 'tsd';
import { Values } from '../..';

// Arrays
type STRING = Values<string[]>;
type ASDF_FOO = Values<Array<'asdf' | 'foo'>>;

expectAssignable<STRING>('adf');
expectAssignable<ASDF_FOO>('asdf');
expectAssignable<ASDF_FOO>('foo');

// Objects
type STRING2 = Values<Record<number, string>>;
type FOO = Values<Record<number, 'foo'>>;
type BAR = Values<{ foo: 'bar' }>;

expectAssignable<STRING2>('adf');
expectAssignable<FOO>('foo');
expectAssignable<BAR>('bar');
