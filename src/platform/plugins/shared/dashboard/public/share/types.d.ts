import type { DashboardState } from '../../server';
export type ExportJsonStatus = 'loading' | 'success' | 'error';
export interface ExportJsonSanitizedState {
    status: ExportJsonStatus;
    data: DashboardState | undefined;
    warnings: string[];
    error: Error | undefined;
}
