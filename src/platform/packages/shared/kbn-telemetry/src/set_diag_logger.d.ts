import type { LogLevelId, Logger } from '@kbn/logging';
/**
 * Helper to make it easier to configure OTel's {@link DiagLogger}.
 * @param logger {@link Logger}
 * @param logLevel The {@link LogLevelId} to set the Diag logger to.
 */
export declare function setDiagLogger(logger: Logger, logLevel?: LogLevelId): void;
