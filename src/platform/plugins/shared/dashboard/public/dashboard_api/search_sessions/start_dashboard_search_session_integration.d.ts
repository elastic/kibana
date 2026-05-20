import { type BehaviorSubject } from 'rxjs';
import type { DashboardApi, DashboardCreationOptions } from '../..';
import type { DashboardInternalApi } from '../types';
/**
 * Enables dashboard search sessions.
 */
export declare function startDashboardSearchSessionIntegration(dashboardApi: DashboardApi, dashboardInternalApi: DashboardInternalApi, searchSessionSettings: DashboardCreationOptions['searchSessionSettings'], setSearchSessionId: (searchSessionId: string) => void, searchSessionGenerationInProgress$: BehaviorSubject<boolean>): (() => void) | undefined;
