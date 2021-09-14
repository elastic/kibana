/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

import { expectType } from 'tsd';
import setWith from '../fp/setWith';

const someObj: object = {};
const anyValue: any = 'any value';

function customizer(value: any, key: string, obj: object) {
  expectType<any>(value);
  expectType<string>(key);
  expectType<object>(obj);
}

expectType<object>(setWith(customizer, 'a.b.c', anyValue, someObj));
expectType<object>(setWith(customizer)('a.b.c', anyValue, someObj));
expectType<object>(setWith(customizer)('a.b.c')(anyValue, someObj));
expectType<object>(setWith(customizer)('a.b.c')(anyValue)(someObj));
expectType<object>(setWith(customizer, 'a.b.c')(anyValue)(someObj));
expectType<object>(setWith(customizer, 'a.b.c', anyValue)(someObj));
expectType<object>(setWith(customizer, 'a.b.c')(anyValue, someObj));

expectType<object>(setWith(customizer, ['a.b.c'], anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c'])(anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c'], anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c'])(anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c'])(anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c'], anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c'])(anyValue, someObj));

expectType<object>(setWith(customizer, ['a.b.c', 2, Symbol('hep')], anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c', 2, Symbol('hep')])(anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c', 2, Symbol('hep')], anyValue, someObj));
expectType<object>(setWith(customizer)(['a.b.c', 2, Symbol('hep')])(anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c', 2, Symbol('hep')])(anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c', 2, Symbol('hep')], anyValue)(someObj));
expectType<object>(setWith(customizer, ['a.b.c', 2, Symbol('hep')])(anyValue, someObj));
