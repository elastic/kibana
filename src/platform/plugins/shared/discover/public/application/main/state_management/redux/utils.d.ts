import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { DataViewListItem, SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { type TabItem } from '@kbn/unified-tabs';
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { InternalStateDependencies, InternalStateDispatch, TabActionPayload } from './internal_state';
import type { DiscoverInternalState, TabState } from './types';
type CreateInternalStateAsyncThunk = ReturnType<typeof createAsyncThunk.withTypes<{
    state: DiscoverInternalState;
    dispatch: InternalStateDispatch;
    extra: InternalStateDependencies;
}>>;
export declare const createInternalStateAsyncThunk: CreateInternalStateAsyncThunk;
type WithoutTabId<TPayload extends TabActionPayload> = Omit<TPayload, 'tabId'>;
type VoidIfEmpty<T> = keyof T extends never ? void : T;
export declare const createTabActionInjector: (tabId: string) => <TPayload extends TabActionPayload, TReturn>(actionCreator: (params: TPayload) => TReturn) => (payload: VoidIfEmpty<WithoutTabId<TPayload>>) => TReturn;
export type TabActionInjector = ReturnType<typeof createTabActionInjector>;
export declare const createTabItem: (allTabs: TabState[]) => TabItem;
/**
 * Gets a minimal representation of the data view in a serialized
 * search source. Useful when you want e.g. the time field name
 * and don't have access to the full data view.
 */
export declare const getSerializedSearchSourceDataViewDetails: (serializedSearchSource: SerializedSearchSourceFields | undefined, savedDataViews: DataViewListItem[]) => Pick<DataView, "id" | "timeFieldName"> | undefined;
/**
 * Parses a JSON string into a ControlPanelsState object.
 * If the JSON is invalid or null, it returns an empty object.
 *
 * @param jsonString - The JSON string to parse.
 * @returns A ControlPanelsState object or an empty object if parsing fails.
 */
export declare const parseControlGroupJson: (jsonString?: string | null) => ControlPanelsState<OptionsListESQLControlState>;
/**
 * @param panels - The control panels state, which may be null.
 * @description Extracts ESQL variables from the control panels state.
 * Each ESQL control panel is expected to have a `variableName`, `variableType`, and `selectedOptions`.
 * Returns an array of `ESQLControlVariable` objects.
 * If `panels` is null or empty, it returns an empty array.
 * @returns An array of ESQLControlVariable objects.
 */
export declare const extractEsqlVariables: (panels: ControlPanelsState<OptionsListESQLControlState> | null) => ESQLControlVariable[];
export {};
