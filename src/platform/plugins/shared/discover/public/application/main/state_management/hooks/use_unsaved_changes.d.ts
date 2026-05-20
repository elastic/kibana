import type { AppMountParameters } from '@kbn/core/public';
import { type InternalStateStore, type RuntimeStateManager } from '../redux';
export declare const useUnsavedChanges: ({ internalState, runtimeStateManager, onAppLeave, }: {
    internalState: InternalStateStore;
    runtimeStateManager: RuntimeStateManager;
    onAppLeave?: AppMountParameters["onAppLeave"];
}) => void;
