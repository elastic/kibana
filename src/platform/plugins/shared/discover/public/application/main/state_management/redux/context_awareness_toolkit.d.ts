import type { ProfileStateRegistry } from '../../../../../common/context_awareness';
import type { ContextAwarenessToolkit } from '../../../../context_awareness/toolkit';
import type { InternalStateStore } from './internal_state';
export declare const createContextAwarenessToolkit: ({ internalState, profileStateRegistry, tabId, }: {
    internalState: InternalStateStore;
    profileStateRegistry: ProfileStateRegistry;
    tabId: string;
}) => ContextAwarenessToolkit;
