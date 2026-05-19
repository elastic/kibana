import type { CustomMetrics, Meta } from './performance_context';
interface UsePageReadyProps {
    customMetrics?: CustomMetrics;
    isReady: boolean;
    meta?: Meta;
    isRefreshing: boolean;
    customInitialLoad?: {
        value: boolean;
        onInitialLoadReported: () => void;
    };
}
export declare const usePageReady: ({ customInitialLoad, isReady, isRefreshing, customMetrics, meta, }: UsePageReadyProps) => void;
export {};
