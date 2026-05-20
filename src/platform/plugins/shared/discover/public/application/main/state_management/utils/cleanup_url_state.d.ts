import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState } from '../redux';
export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
    /**
     * Necessary to take care of legacy links [fieldName,direction]
     */
    sort?: string[][] | [string, string];
    /**
     * Legacy data view ID prop
     */
    index?: string;
}
/**
 * Takes care of the given url state, migrates legacy props and cleans up empty props
 * @param appStateFromUrl
 * @param uiSettings
 */
export declare function cleanupUrlState(appStateFromUrl: AppStateUrl | null | undefined, uiSettings: IUiSettingsClient): DiscoverAppState | undefined;
export declare function getCurrentUrlState(stateStorage: IKbnUrlStateStorage, services: DiscoverServices): DiscoverAppState;
