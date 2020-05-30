/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { expectType } from 'tsd';
import { Values } from '../index';

// Arrays
type STRING = Values<string[]>;
type ASDF_FOO = Values<Array<'asdf' | 'foo'>>;

expectType<STRING>('adf');
expectType<ASDF_FOO>('asdf');
expectType<ASDF_FOO>('foo');

// Objects
type STRING2 = Values<Record<number, string>>;
type FOO = Values<Record<number, 'foo'>>;
type BAR = Values<{ foo: 'bar' }>;

expectType<STRING2>('adf');
expectType<FOO>('foo');
expectType<BAR>('bar');
