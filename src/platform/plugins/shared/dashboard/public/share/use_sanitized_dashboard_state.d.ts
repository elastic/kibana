import type { DashboardState } from '../../server';
import type { ExportJsonSanitizedState } from './types';
export type UseSanitizedDashboardStateResult = ExportJsonSanitizedState & {
    retry: () => void;
};
export declare function useSanitizedDashboardState({ dashboardState, }: {
    dashboardState: DashboardState;
}): UseSanitizedDashboardStateResult;
