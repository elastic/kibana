import type { Observable } from 'rxjs';
import type { IElasticsearchConfig } from '@kbn/core-elasticsearch-server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
export declare class EsLegacyConfigService {
    /**
     * The elasticsearch config value at a given point in time.
     */
    private config?;
    /**
     * An observable that emits elasticsearch config.
     */
    private config$?;
    /**
     * A reference to the subscription to the elasticsearch observable
     */
    private configSub?;
    /**
     * URL to cloud instance of elasticsearch if available
     */
    private cloudUrl?;
    setup(config$: Observable<IElasticsearchConfig>, cloud?: CloudSetup): void;
    stop(): void;
    readConfig(): Promise<IElasticsearchConfig>;
    getCloudUrl(): string | undefined;
}
