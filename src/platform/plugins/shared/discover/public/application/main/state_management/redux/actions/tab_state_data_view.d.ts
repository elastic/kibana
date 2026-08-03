import type { DataView, DataViewSpec } from '@kbn/data-views-plugin/public';
import { type TabActionPayload, type InternalStateThunkActionCreator } from '../internal_state';
/**
 * Set the data view in the tab's runtime state
 */
export declare const setDataView: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataView: DataView;
    }>
]>;
/**
 * Assign the next data view to the tab's runtime state and pause the refresh interval
 */
export declare const assignNextDataView: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataView: DataView;
    }>
]>;
/**
 * Function executed when switching data view in the UI
 */
export declare const changeDataView: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataViewOrDataViewId: string | DataView;
    }>
], Promise<void>>;
/**
 * Triggered when a new data view is created
 */
export declare const onDataViewCreated: InternalStateThunkActionCreator<[
    TabActionPayload<{
        nextDataView: DataView;
    }>
], Promise<void>>;
/**
 * Triggered when a new data view is edited
 */
export declare const onDataViewEdited: InternalStateThunkActionCreator<[
    TabActionPayload<{
        editedDataView: DataView;
    }>
], Promise<void>>;
/**
 * When editing an ad hoc data view, a new id needs to be generated for the data view
 * This is to prevent duplicate ids messing with our system
 */
export declare const updateAdHocDataViewId: InternalStateThunkActionCreator<[
    TabActionPayload<{
        editedDataView: DataView;
    }>
], Promise<DataView | undefined>>;
/**
 * Create and select a temporary/adhoc data view by a given spec
 * Used by the Data View Picker
 */
export declare const createAndAppendAdHocDataView: InternalStateThunkActionCreator<[
    TabActionPayload<{
        dataViewSpec: DataViewSpec;
    }>
], Promise<DataView>>;
