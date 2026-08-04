import type { OpenConnectionDetailsParams } from './open_connection_details';
type OpenWiredConnectionDetailsProps = Omit<OpenConnectionDetailsParams['props'], 'start'>;
export type OpenWiredConnectionDetailsParams = Partial<Omit<{
    props: OpenWiredConnectionDetailsProps;
}, 'start'>>;
export declare const openWiredConnectionDetails: (params?: OpenWiredConnectionDetailsParams) => Promise<import("@kbn/core/public").OverlayRef>;
export {};
