import type { ProfileStateRegistry } from '../../common/context_awareness';
import type { ContextAwarenessToolkit, ContextAwarenessToolkitActions } from './toolkit';
/**
 * Creates a complete context awareness toolkit for hosts that do not have tab-backed state.
 * Profile state is kept in memory for the lifetime of the scoped host instance.
 */
export declare const createInMemoryContextAwarenessToolkit: ({ actions, profileStateRegistry, }: {
    actions?: ContextAwarenessToolkitActions;
    profileStateRegistry: ProfileStateRegistry;
}) => ContextAwarenessToolkit;
