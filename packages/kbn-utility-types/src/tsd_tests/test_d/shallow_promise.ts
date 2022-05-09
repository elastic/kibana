/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectType } from 'tsd';
import { ShallowPromise } from '../..';

type P1 = ShallowPromise<string>;
type P2 = ShallowPromise<ShallowPromise<string>>;
type P3 = ShallowPromise<ShallowPromise<ShallowPromise<string>>>;
type P4 = ShallowPromise<ShallowPromise<ShallowPromise<number>>>;

expectType<P1>(Promise.resolve<string>('a'));
expectType<P2>(Promise.resolve<string>('a'));
expectType<P3>(Promise.resolve<string>('a'));
expectType<P4>(Promise.resolve<number>(123));
