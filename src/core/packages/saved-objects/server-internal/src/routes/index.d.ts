import type { Logger } from '@kbn/logging';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { SavedObjectConfig, IKibanaMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { DocLinksServiceSetup } from '@kbn/core-doc-links-server';
export declare function registerRoutes({ http, coreUsageData, logger, config, migratorPromise, kibanaVersion, isServerless, docLinks, }: {
    http: InternalHttpServiceSetup;
    coreUsageData: InternalCoreUsageDataSetup;
    logger: Logger;
    config: SavedObjectConfig;
    migratorPromise: Promise<IKibanaMigrator>;
    kibanaVersion: string;
    isServerless: boolean;
    docLinks: DocLinksServiceSetup;
}): void;
