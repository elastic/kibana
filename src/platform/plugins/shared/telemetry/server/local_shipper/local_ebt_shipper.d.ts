import type { AnalyticsClientInitContext, Event, IShipper } from '@kbn/core-analytics-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
export interface LocalShipperConfig {
    getElasticsearchClient: () => Promise<ElasticsearchClient>;
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
