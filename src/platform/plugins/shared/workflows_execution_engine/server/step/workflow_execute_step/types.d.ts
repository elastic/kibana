import type { JsonValue } from '@kbn/utility-types';
export interface StrategyResult {
    status: 'completed' | 'failed' | 'waiting' | 'cancelled';
    output?: JsonValue;
    error?: Error;
}
