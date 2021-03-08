/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

import { expectType } from 'tsd';
import set from '../set';

const someObj: object = {};
const anyValue: any = 'any value';

expectType<object>(set(someObj, 'a.b.c', anyValue));
expectType<object>(set(someObj, ['a.b.c'], anyValue));
expectType<object>(set(someObj, ['a.b.c', 2, Symbol('hep')], anyValue));
