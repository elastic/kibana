import { BehaviorSubject } from 'rxjs';
import type { DataSourceContext, DataSourceProfileProvider } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
export type LogOverViewAccordionExpandedValue = 'stacktrace' | 'quality_issues' | undefined;
export interface LogOverviewContext {
    recordId: string;
    initialAccordionSection: LogOverViewAccordionExpandedValue;
}
export interface LogsDataSourceContext {
    logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
}
export type LogsDataSourceProfileProvider = DataSourceProfileProvider<LogsDataSourceContext>;
export declare const isLogsDataSourceContext: (dataSourceContext: DataSourceContext) => dataSourceContext is DataSourceContext & LogsDataSourceContext;
export declare const createLogsDataSourceProfileProvider: (services: ProfileProviderServices) => LogsDataSourceProfileProvider;
