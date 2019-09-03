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
import { ShallowPromise } from '../index';

type P1 = ShallowPromise<string>;
type P2 = ShallowPromise<ShallowPromise<string>>;
type P3 = ShallowPromise<ShallowPromise<ShallowPromise<string>>>;
type P4 = ShallowPromise<ShallowPromise<ShallowPromise<number>>>;

expectType<P1>(Promise.resolve<string>('a'));
expectType<P2>(Promise.resolve<string>('a'));
expectType<P3>(Promise.resolve<string>('a'));
expectType<P4>(Promise.resolve<number>(123));
