import { ElasticsearchService } from './ElasticsearchService';
import { ElasticsearchClusterType } from '../../types';

export class ElasticsearchRequestHelpers {
  constructor(private readonly elasticsearchService: ElasticsearchService) {
  }

  getClusterOfType(type: ElasticsearchClusterType) {
    return this.elasticsearchService.getClusterOfType$(type)
      .first()
      .toPromise();
  }
}
