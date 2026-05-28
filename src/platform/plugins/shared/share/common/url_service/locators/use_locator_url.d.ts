import type { DependencyList } from 'react';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorGetUrlParams, LocatorPublic } from '..';
export declare const useLocatorUrl: <P extends SerializableRecord>(locator: LocatorPublic<P> | null | undefined, params: P, getUrlParams?: LocatorGetUrlParams, deps?: DependencyList) => string;
