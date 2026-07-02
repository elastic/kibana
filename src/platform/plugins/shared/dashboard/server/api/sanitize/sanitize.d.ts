import type { DashboardState } from '../types';
import type { DashboardSanitizeResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
export declare function sanitize(dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>, dashboardState: DashboardState): Promise<DashboardSanitizeResponseBody>;
