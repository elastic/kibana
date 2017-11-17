import { k$, first, toPromise } from '@elastic/kbn-observable';

import { ElasticsearchService } from './ElasticsearchService';
import { ElasticsearchClusterType } from './ElasticsearchConfig';
import { Cluster } from './Cluster';

export class ElasticsearchRequestHelpers {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  // NB: now unused. This was getting bound to
  // to the router's `onRequest` method, which has
  // been abandoned in favor of creating services
  // (for plugins) in the request handler or plugin
  // constructor
  getClusterOfType(type: ElasticsearchClusterType): Promise<Cluster> {
    return k$(this.elasticsearchService.getClusterOfType$(type))(
      first(),
      toPromise()
    );
  }
}
