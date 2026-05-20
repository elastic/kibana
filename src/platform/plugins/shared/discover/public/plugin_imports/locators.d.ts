import type { DiscoverAppLocatorParams } from '../../common';
export declare const appLocatorGetLocation: ({ useHash, }: {
    useHash: boolean;
}, params: DiscoverAppLocatorParams) => Promise<import("../../../share/public").KibanaLocation<object>>;
export { contextAppLocatorGetLocation } from '../application/context/services/locator_get_location';
export { singleDocLocatorGetLocation } from '../application/doc/locator_get_location';
export { esqlLocatorGetLocation } from '../../common/esql_locator_get_location';
