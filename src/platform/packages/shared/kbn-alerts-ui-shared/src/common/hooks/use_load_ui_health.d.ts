import type { HttpStart } from '@kbn/core-http-browser';
export interface UseLoadUiHealthProps {
    http: HttpStart;
}
export declare const useLoadUiHealth: (props: UseLoadUiHealthProps) => {
    data: import("../apis/fetch_ui_health_status").UiHealthCheck | undefined;
    isLoading: boolean;
    isInitialLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
};
