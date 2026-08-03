import type { FindDashboardsByIdResponse } from './types';
export declare const findService: {
    findById: (id: string) => Promise<FindDashboardsByIdResponse>;
    findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
    findByTitle: (title: string) => Promise<{
        id: string;
    } | undefined>;
    search: (searchParams: Partial<import("../../server").DashboardSearchRequestParams>) => Promise<Readonly<{} & {
        meta: Readonly<{} & {
            page: number;
            total: number;
            per_page: number;
        }>;
        data: Readonly<{} & {
            meta: Readonly<{
                version?: string | undefined;
                managed?: boolean | undefined;
                created_at?: string | undefined;
                created_by?: string | undefined;
                updated_at?: string | undefined;
                updated_by?: string | undefined;
                owner?: string | undefined;
            } & {}>;
            id: string;
            data: Readonly<{
                description?: string | undefined;
                time_range?: Readonly<{
                    mode?: "absolute" | "relative" | undefined;
                } & {
                    from: string;
                    to: string;
                }> | undefined;
                tags?: string[] | undefined;
                access_control?: Readonly<{
                    access_mode?: "default" | "write_restricted" | undefined;
                } & {}> | undefined;
            } & {
                title: string;
            }>;
        }>[];
    }>>;
};
