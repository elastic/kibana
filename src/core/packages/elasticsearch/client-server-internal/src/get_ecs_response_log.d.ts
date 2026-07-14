import { type DiagnosticResult } from '@elastic/elasticsearch';
import { type LogMeta } from '@kbn/logging';
/**
 * Retruns ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export declare function getEcsResponseLog(event: DiagnosticResult, bytes?: number): LogMeta;
