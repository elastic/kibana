import React, { type PropsWithChildren } from 'react';
import type { ScopedProfilesManager } from '../../context_awareness';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
interface ScopedServices {
    scopedProfilesManager: ScopedProfilesManager;
    scopedEBTManager: ScopedDiscoverEBTManager;
}
export declare const ScopedServicesProvider: ({ scopedProfilesManager, scopedEBTManager, children, }: PropsWithChildren<ScopedServices>) => React.JSX.Element;
export declare const useScopedServices: () => ScopedServices;
export {};
