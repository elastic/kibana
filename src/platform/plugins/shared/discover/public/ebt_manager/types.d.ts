import type { CoreSetup } from '@kbn/core/public';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import type { BehaviorSubject } from 'rxjs';
export interface DiscoverEBTContextProps {
    discoverProfiles: string[];
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;
export type ReportEvent = CoreSetup['analytics']['reportEvent'];
export type ReportPerformanceEvent = (eventData: PerformanceMetricEvent) => void;
export type UpdateProfilesContextWith = (discoverProfiles: DiscoverEBTContextProps['discoverProfiles']) => void;
export type SetAsActiveManager = () => void;
