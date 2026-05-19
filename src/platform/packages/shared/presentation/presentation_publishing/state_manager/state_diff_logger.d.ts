export declare function shouldLogStateDiff(): boolean;
/**
 * Conditional (window.ELASTIC_PRESENTATION_LOGGER needs to be set to true) logger function
 */
export declare function logStateDiff(label: string, lastValue: unknown, currentValue: unknown): Promise<void>;
