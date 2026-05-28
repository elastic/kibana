import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './types';
export declare const context: React.Context<KibanaReactContextValue<Partial<import("@kbn/core/packages/lifecycle/browser").CoreStart>>>;
export declare const useKibana: <Extra extends object = {}>() => KibanaReactContextValue<KibanaServices & Extra>;
export declare const withKibana: <Props extends {
    kibana: KibanaReactContextValue<{}>;
}>(type: React.ComponentType<Props>) => FC<Omit<Props, "kibana">>;
export declare const createKibanaReactContext: <Services extends KibanaServices>(services: Services) => KibanaReactContext<Services>;
export declare const KibanaContextProvider: FC<PropsWithChildren<{
    services?: {} | undefined;
}>>;
