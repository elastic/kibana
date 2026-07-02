import type { KibanaLocation } from '@kbn/share-plugin/public';
import type { ApplyGlobalFilterActionContext } from '@kbn/unified-search-plugin/public';
import type { DashboardLocatorParams } from '../../common';
import type { DashboardDrilldownState } from '../../server/dashboard_drilldown/types';
export declare function getLocation(drilldownState: DashboardDrilldownState, context: ApplyGlobalFilterActionContext): Promise<KibanaLocation<DashboardLocatorParams>>;
