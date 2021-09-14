/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

import { expectType } from 'tsd';
import assocPath from '../fp/assocPath';

const someObj: object = {};
const anyValue: any = 'any value';

expectType<object>(assocPath('a.b.c', anyValue, someObj));
expectType<object>(assocPath('a.b.c')(anyValue, someObj));
expectType<object>(assocPath('a.b.c')(anyValue)(someObj));
expectType<object>(assocPath('a.b.c', anyValue)(someObj));

expectType<object>(assocPath(['a.b.c'], anyValue, someObj));
expectType<object>(assocPath(['a.b.c'])(anyValue, someObj));
expectType<object>(assocPath(['a.b.c'])(anyValue)(someObj));
expectType<object>(assocPath(['a.b.c'], anyValue)(someObj));

expectType<object>(assocPath(['a.b.c', 2, Symbol('hep')], anyValue, someObj));
expectType<object>(assocPath(['a.b.c', 2, Symbol('hep')])(anyValue, someObj));
expectType<object>(assocPath(['a.b.c', 2, Symbol('hep')])(anyValue)(someObj));
expectType<object>(assocPath(['a.b.c', 2, Symbol('hep')], anyValue)(someObj));
