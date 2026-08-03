import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-browser';
import type { HttpStart } from '@kbn/core-http-browser';
export interface LocalShipperConfig {
    getHttpStart: () => Promise<HttpStart>;
}
export declare class LocalEBTShipper implements IShipper {
    private readonly config;
    private readonly initContext;
    static shipperName: string;
    constructor(config: LocalShipperConfig, initContext: AnalyticsClientInitContext);
    reportEvents: (events: Event[]) => void;
    optIn: () => void;
    flush: () => Promise<void>;
    shutdown: () => void;
}
