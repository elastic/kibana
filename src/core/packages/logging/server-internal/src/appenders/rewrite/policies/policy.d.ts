import type { LogRecord } from '@kbn/logging';
/**
 * Rewrites a {@link LogRecord} based on the policy's configuration.
 **/
export interface RewritePolicy {
    rewrite(record: LogRecord): LogRecord;
}
