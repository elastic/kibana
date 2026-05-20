import type { FindDashboardsByIdResponse } from './types';
export declare const findService: {
    findById: (id: string) => Promise<FindDashboardsByIdResponse>;
    findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
    findByTitle: (title: string) => Promise<{
        id: string;
    } | undefined>;
    search: (searchParams: import("../../server").DashboardSearchRequestParams) => Promise<Readonly<{} & {
        page: number;
        total: number;
        dashboards: Readonly<{} & {
            data: Readonly<{
                description?: string | undefined;
                tags?: string[] | undefined;
                time_range?: Readonly<{
                    mode?: "absolute" | "relative" | undefined;
                } & {
                    from: string;
                    to: string;
                }> | undefined;
                access_control?: Readonly<{
                    access_mode?: "default" | "write_restricted" | undefined;
                } & {}> | undefined;
            } & {
                title: string;
            }>;
            id: string;
            meta: Readonly<{
                managed?: boolean | undefined;
                version?: string | undefined;
                updated_at?: string | undefined;
                updated_by?: string | undefined;
                created_at?: string | undefined;
                created_by?: string | undefined;
                owner?: string | undefined;
            } & {}>;
        }>[];
    }>>;
};
