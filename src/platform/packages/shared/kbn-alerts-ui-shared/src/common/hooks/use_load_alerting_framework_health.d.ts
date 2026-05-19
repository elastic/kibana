import type { HttpStart } from '@kbn/core-http-browser';
export interface UseLoadAlertingFrameworkHealthProps {
    http: HttpStart;
}
export declare const useLoadAlertingFrameworkHealth: (props: UseLoadAlertingFrameworkHealthProps) => {
    data: import("@kbn/alerting-types").AlertingFrameworkHealth | undefined;
    isLoading: boolean;
    isInitialLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
};
