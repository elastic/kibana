import { ElasticsearchService } from './ElasticsearchService';
import { ElasticsearchClusterType } from '../../types';
import { Cluster } from './Cluster';

export class ElasticsearchRequestHelpers {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  getClusterOfType(type: ElasticsearchClusterType): Promise<Cluster> {
    return this.elasticsearchService
      .getClusterOfType$(type)
      .first()
      .toPromise();
  }
}
