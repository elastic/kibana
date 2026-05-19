import type { DataView } from '@kbn/data-views-plugin/common';
import { type DiscoverAppState, type DefaultProfileStateField, type DefaultProfileStateFields, type ProfileStateSnapshot, type TabState } from '../redux';
import type { ScopedProfilesManager } from '../../../../context_awareness';
import type { DataDocumentsMsg } from '../discover_data_state_container';
export declare const getDefaultProfileState: ({ scopedProfilesManager, defaultProfileState, dataView, }: {
    scopedProfilesManager: ScopedProfilesManager;
    defaultProfileState: TabState["defaultProfileState"];
    dataView: DataView;
}) => {
    /**
     * Returns state that should be updated before data fetching occurs,
     * for example state used as part of the data fetching process
     * @returns The state to reset to before fetching data
     */
    getPreFetchState: () => DiscoverAppState | undefined;
    /**
     * Returns state that should be updated after data fetching occurs,
     * for example state used to modify the UI after receiving data
     * @returns The state to reset to after fetching data
     */
    getPostFetchState: ({ defaultColumns, esqlQueryColumns, }: {
        defaultColumns: string[];
        esqlQueryColumns: DataDocumentsMsg["esqlQueryColumns"];
    }) => DiscoverAppState | undefined;
};
export declare const getProfileStateSnapshot: (appState: TabState["appState"], fieldsToReset: TabState["defaultProfileState"]["fieldsToReset"]) => ProfileStateSnapshot | undefined;
export declare const getFieldsToReset: (shouldResetByField: Record<DefaultProfileStateField, boolean>) => DefaultProfileStateFields;
