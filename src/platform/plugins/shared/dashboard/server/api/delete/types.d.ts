import type { DashboardState } from '../types';
export interface DashboardDeleteResponseBody {
    id: string;
    data: Pick<DashboardState, 'title' | 'tags'>;
}
