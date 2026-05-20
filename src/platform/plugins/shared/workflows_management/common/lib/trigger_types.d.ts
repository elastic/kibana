export interface WorkflowTrigger {
    type: 'alert' | 'scheduled' | 'manual';
    with?: Record<string, unknown>;
}
/**
 * Parses interval string in format like "5m", "2h", "1d", "30s"
 * @returns Object with value and unit, or null if invalid
 */
export declare function parseIntervalString(intervalString: string): {
    value: number;
    unit: string;
} | null;
