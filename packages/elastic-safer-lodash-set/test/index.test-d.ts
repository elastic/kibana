/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

import { expectType } from 'tsd';
import { set, setWith } from '../';

const someObj: object = {};
const anyValue: any = 'any value';

expectType<object>(set(someObj, 'a.b.c', anyValue));
expectType<object>(
  setWith(someObj, 'a.b.c', anyValue, (value, key, obj) => {
    expectType<any>(value);
    expectType<string>(key);
    expectType<object>(obj);
  })
);

expectType<object>(set(someObj, ['a.b.c'], anyValue));
expectType<object>(
  setWith(someObj, ['a.b.c'], anyValue, (value, key, obj) => {
    expectType<any>(value);
    expectType<string>(key);
    expectType<object>(obj);
  })
);

expectType<object>(set(someObj, ['a.b.c', 2, Symbol('hep')], anyValue));
expectType<object>(
  setWith(someObj, ['a.b.c', 2, Symbol('hep')], anyValue, (value, key, obj) => {
    expectType<any>(value);
    expectType<string>(key);
    expectType<object>(obj);
  })
);
