import { type Observable } from 'rxjs';
interface PdfTracker {
    setCpuUsage: (cpu: number) => void;
    setMemoryUsage: (memory: number) => void;
    withGeneratePdfSpan: <T>(fn: () => Observable<T>) => Observable<T>;
    withScreenshotsSpan: <T>(fn: () => Observable<T>) => Observable<T>;
}
export declare function getTracker(): PdfTracker;
export {};
