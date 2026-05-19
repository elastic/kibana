import type { ControlGroupRuntimeState } from '@kbn/control-group-renderer';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { Dispatch, SetStateAction } from 'react';
interface UseControlGroupSyncToLocalStorageArgs {
    Storage: typeof Storage;
    storageKey: string;
    shouldSync: boolean;
}
type UseControlGroupSyncToLocalStorage = (args: UseControlGroupSyncToLocalStorageArgs) => {
    controlGroupState: ControlGroupRuntimeState | undefined;
    setControlGroupState: Dispatch<SetStateAction<ControlGroupRuntimeState>>;
    getStoredControlGroupState: () => ControlGroupRuntimeState | undefined;
};
export declare const useControlGroupSyncToLocalStorage: UseControlGroupSyncToLocalStorage;
export {};
