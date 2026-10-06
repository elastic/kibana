import type { estypes } from '@elastic/elasticsearch';
import { type Query } from '@elastic/eui';
import type { Request } from '../../../../../../common/adapters/request/types';
export declare function findClusters(request: Request, query?: Query): Record<string, estypes.ClusterDetails>;
