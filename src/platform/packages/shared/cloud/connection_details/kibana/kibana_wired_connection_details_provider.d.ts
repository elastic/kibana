import * as React from 'react';
import type { KibanaConnectionDetailsProviderProps } from './kibana_connection_details_provider';
export type KibanaWiredConnectionDetailsProviderProps = Omit<KibanaConnectionDetailsProviderProps, 'start'>;
export declare const KibanaWiredConnectionDetailsProvider: React.FC<React.PropsWithChildren<KibanaWiredConnectionDetailsProviderProps>>;
