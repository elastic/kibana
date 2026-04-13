import type { OperatorFunction } from 'rxjs';
export declare class Semaphore {
    private capacity;
    private queue;
    constructor(capacity: number);
    acquire<T>(): OperatorFunction<T, T>;
    protected release(): void;
    private next;
    private schedule;
    private cancel;
}
