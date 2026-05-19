import * as t from 'io-ts';
import type { ParseableType } from '../parseable_types';
export declare function deepExactRt<T extends t.Type<any> | ParseableType>(type: T): T;
