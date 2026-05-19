import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ControlGroupRendererApi, ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
/**
 * Custom hook to manage ESQL variables in the control group for Discover.
 * It synchronizes ESQL control panel state with the application's internal Redux state
 * and handles persistence to storage.
 *
 * @param options - Configuration options for the hook.
 * @param options.isEsqlMode - Indicates if the current application mode is ESQL.
 * @param options.controlGroupApi - The ControlGroupRendererApi instance for interacting with control panels.
 * @param options.currentEsqlVariables - The currently active ESQL variables from the application state.
 * @param options.onUpdateESQLQuery - Callback function to update the ESQL query.
 *
 * @returns An object containing handler functions for saving and canceling control changes,
 * and a getter function to retrieve the currently active control panels state for the current tab.
 */
export declare const useESQLVariables: ({ isEsqlMode, controlGroupApi, currentEsqlVariables, onUpdateESQLQuery, }: {
    isEsqlMode: boolean;
    controlGroupApi?: ControlGroupRendererApi;
    currentEsqlVariables?: ESQLControlVariable[];
    onUpdateESQLQuery: (query: string) => void;
}) => {
    onSaveControl: (controlState: Record<string, unknown>, updatedQuery: string) => Promise<void>;
    getActivePanels: () => ControlPanelsState<OptionsListESQLControlState> | undefined;
};
