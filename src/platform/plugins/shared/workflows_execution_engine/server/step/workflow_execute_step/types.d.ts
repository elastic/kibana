export interface StrategyResult {
    status: 'completed' | 'failed' | 'waiting' | 'cancelled';
    output?: Record<string, unknown>;
    error?: Error;
}
