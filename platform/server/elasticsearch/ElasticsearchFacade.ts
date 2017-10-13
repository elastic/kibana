import { k$, first, toPromise } from 'kbn-observable';

import { ElasticsearchService } from './ElasticsearchService';
import { ElasticsearchClusterType } from './ElasticsearchConfig';
import { Cluster } from './Cluster';

export class ElasticsearchRequestHelpers {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  getClusterOfType(type: ElasticsearchClusterType): Promise<Cluster> {
    return k$(this.elasticsearchService.getClusterOfType$(type))(
      first(),
      toPromise()
    );
  }
}
