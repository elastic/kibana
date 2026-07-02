import type { DashboardState } from '../../types';
export declare function transformTagsIn(tags: DashboardState['tags']): {
    type: string;
    id: string;
    name: string;
}[];
