import type { FC, PropsWithChildren } from 'react';
import type React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { KibanaReactOverlays } from '../overlays';
export type KibanaServices = Partial<CoreStart>;
export interface KibanaReactContextValue<Services extends KibanaServices> {
    readonly services: Services;
    readonly overlays: KibanaReactOverlays;
}
export interface KibanaReactContext<T extends KibanaServices> {
    value: KibanaReactContextValue<T>;
    Provider: FC<PropsWithChildren<{
        services?: T;
    }>>;
    Consumer: React.Consumer<KibanaReactContextValue<T>>;
}
