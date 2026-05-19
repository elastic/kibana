import type { Observable } from 'rxjs';
import type { ServiceStatus } from '@kbn/core-status-common';
import type { ElasticsearchStatusMeta } from './types';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
export declare const calculateStatus$: (esNodesCompatibility$: Observable<NodesVersionCompatibility>) => Observable<ServiceStatus<ElasticsearchStatusMeta>>;
