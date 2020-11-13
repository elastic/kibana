/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

import { expectType } from 'tsd';
import assoc from '../fp/assoc';

const someObj: object = {};
const anyValue: any = 'any value';

expectType<object>(assoc('a.b.c', anyValue, someObj));
expectType<object>(assoc('a.b.c')(anyValue, someObj));
expectType<object>(assoc('a.b.c')(anyValue)(someObj));
expectType<object>(assoc('a.b.c', anyValue)(someObj));

expectType<object>(assoc(['a.b.c'], anyValue, someObj));
expectType<object>(assoc(['a.b.c'])(anyValue, someObj));
expectType<object>(assoc(['a.b.c'])(anyValue)(someObj));
expectType<object>(assoc(['a.b.c'], anyValue)(someObj));

expectType<object>(assoc(['a.b.c', 2, Symbol('hep')], anyValue, someObj));
expectType<object>(assoc(['a.b.c', 2, Symbol('hep')])(anyValue, someObj));
expectType<object>(assoc(['a.b.c', 2, Symbol('hep')])(anyValue)(someObj));
expectType<object>(assoc(['a.b.c', 2, Symbol('hep')], anyValue)(someObj));
