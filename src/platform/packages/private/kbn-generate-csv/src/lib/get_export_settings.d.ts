import type { ByteSizeValue } from '@kbn/config-schema';
import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import type { ReportingConfigType } from '@kbn/reporting-server';
import type { TaskInstanceFields } from '@kbn/reporting-common/types';
import type { CsvPagingStrategy } from '../../types';
export interface CsvExportSettings {
    timezone: string;
    taskInstanceFields: TaskInstanceFields;
    scroll: {
        strategy?: CsvPagingStrategy;
        size: number;
        /**
         * compute scroll duration, duration is returned in ms by default
         */
        duration: (args: TaskInstanceFields, format?: 'ms' | 's') => string;
    };
    bom: string;
    separator: string;
    maxSizeBytes: number | ByteSizeValue;
    checkForFormulas: boolean;
    escapeFormulaValues: boolean;
    escapeValue: (value: string) => string;
    includeFrozen: boolean;
    maxConcurrentShardRequests: number;
    maxRows: number;
}
export declare const getExportSettings: (client: IUiSettingsClient, taskInstanceFields: TaskInstanceFields, config: ReportingConfigType["csv"], timezone: string | undefined, logger: Logger) => Promise<CsvExportSettings>;
