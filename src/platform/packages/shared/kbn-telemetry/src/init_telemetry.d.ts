/**
 *
 * Initializes OpenTelemetry (currently only tracing)
 *
 * @param argv                Process arguments
 * @param rootDir             Root dir of Kibana repo
 * @param isDistributable     Whether this is a distributable build
 * @param serviceName         The service name used in resource attributes
 * @returns                   A function that can be called on shutdown and allows exporters to flush their queue.
 */
export declare const initTelemetry: (argv: string[], rootDir: string, isDistributable: boolean, serviceName: string) => void;
