import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from '../../../server';
export declare function transformPanels(panels: DashboardState['panels'], references?: Reference[]): Promise<({
    type: string;
    id?: string | undefined;
    grid: Readonly<{} & {
        y: number;
        w: number;
        h: number;
        x: number;
    }>;
    config: Readonly<{} & {}>;
} | {
    panels: {
        type: string;
        id?: string | undefined;
        grid: Readonly<{} & {
            y: number;
            w: number;
            h: number;
            x: number;
        }>;
        config: Readonly<{} & {}>;
    }[];
    id?: string | undefined;
    grid: Readonly<{} & {
        y: number;
    }>;
    title: string;
    collapsed: boolean;
})[]>;
