import type { IUiSettingsClient } from '@kbn/core/public';
import type { AggregateQuery, Query } from '@kbn/es-query';
export declare const showTimeFieldColumn: ({ uiSettings, query, }: {
    uiSettings: IUiSettingsClient;
    query?: AggregateQuery | Query;
}) => boolean;
