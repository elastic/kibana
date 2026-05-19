import type { DashboardState } from './types';
export declare function stripUnmappedKeys(dashboardState: Partial<DashboardState>): {
    data: DashboardState;
    warnings: Readonly<{
        panel_references?: Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[] | undefined;
    } & {
        message: string;
        type: "dropped_panel";
        panel_type: string;
        panel_config: Readonly<{} & {}>;
    }>[];
};
