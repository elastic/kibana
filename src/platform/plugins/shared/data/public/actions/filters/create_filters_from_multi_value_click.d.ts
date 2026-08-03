import type { Filter } from '@kbn/es-query';
import type { Truthy } from 'lodash';
import type { MultiValueClickContext } from '../multi_value_click_action';
export type MultiValueClickDataContext = MultiValueClickContext['data'];
export declare const truthy: <T>(value: T) => value is Truthy<T>;
/** @public */
export declare const createFiltersFromMultiValueClickAction: ({ data, negate, }: MultiValueClickDataContext) => Promise<undefined | Filter[]>;
