import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from '../../../server';
export declare function transformPanels(panels: DashboardState['panels'], references?: Reference[]): Promise<({
    type: string;
    id?: string | undefined;
    version?: string | undefined;
    grid: Readonly<{} & {
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    config: Readonly<{} & {}>;
} | {
    panels: {
        type: string;
        id?: string | undefined;
        version?: string | undefined;
        grid: Readonly<{} & {
            x: number;
            y: number;
            w: number;
            h: number;
        }>;
        config: Readonly<{} & {}>;
    }[];
    id?: string | undefined;
    title: string;
    grid: Readonly<{} & {
        y: number;
    }>;
    collapsed: boolean;
})[]>;
