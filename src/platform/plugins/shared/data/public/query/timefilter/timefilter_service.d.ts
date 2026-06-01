import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { TimeHistoryContract, TimefilterContract } from '.';
import type { NowProviderInternalContract } from '../../now_provider';
export interface TimeFilterServiceDependencies {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    minRefreshInterval: number;
}
/**
 * Filter Service
 * @internal
 */
export declare class TimefilterService {
    private readonly nowProvider;
    constructor(nowProvider: NowProviderInternalContract);
    setup({ uiSettings, storage, minRefreshInterval, }: TimeFilterServiceDependencies): TimefilterSetup;
    start(): void;
    stop(): void;
}
/** @public */
export interface TimefilterSetup {
    timefilter: TimefilterContract;
    history: TimeHistoryContract;
}
