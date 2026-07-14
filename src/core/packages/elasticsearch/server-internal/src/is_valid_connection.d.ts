import type { Observable } from 'rxjs';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
/**
 * Validates the output of the ES Compatibility Check and waits for a valid connection.
 * It may also throw on specific config/connection errors to make Kibana halt.
 *
 * @param esNodesCompatibility$ ES Compatibility Check's observable
 *
 * @remarks: Ideally, this will be called during the start lifecycle to figure
 * out any configuration issue as soon as possible.
 */
export declare function isValidConnection(esNodesCompatibility$: Observable<NodesVersionCompatibility>): Promise<NodesVersionCompatibility>;
