import type { Logger } from '@kbn/logging';
import type { Storage } from '@kbn/analytics';
import { Reporter } from '@kbn/analytics';
import type { HttpSetup } from '@kbn/core/public';
interface AnalyticsReporterConfig {
    localStorage: Storage;
    logger: Logger;
    fetch: HttpSetup;
}
export declare function createReporter(config: AnalyticsReporterConfig): Reporter;
export {};
