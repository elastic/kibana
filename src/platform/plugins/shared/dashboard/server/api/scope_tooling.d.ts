import type { DashboardState } from './types';
export declare function stripUnmappedKeys(dashboardState: Partial<DashboardState>): {
    data: DashboardState;
    warnings: Readonly<{
        panel_references?: Readonly<{} & {
            type: string;
            id: string;
            name: string;
        }>[] | undefined;
    } & {
        type: "dropped_panel";
        message: string;
        panel_type: string;
        panel_config: Readonly<{} & {}>;
    }>[];
};
