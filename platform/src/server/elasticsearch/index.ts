import { Observable } from '@kbn/observable';

import { ElasticsearchService } from './elasticsearch_service';
import { registerElasticsearchRoutes } from './api';
import { Router } from '../http';
import { ElasticsearchConfigs } from './elasticsearch_configs';
import { LoggerFactory } from '../../logging';

export { ElasticsearchClusterType } from './elasticsearch_config';
export { AdminClient } from './admin_client';
export { ScopedDataClient } from './scoped_data_client';
export { ElasticsearchService, ElasticsearchConfigs };

export class ElasticsearchModule {
  readonly service: ElasticsearchService;

  constructor(
    readonly config$: Observable<ElasticsearchConfigs>,
    private readonly logger: LoggerFactory
  ) {
    this.service = new ElasticsearchService(this.config$, logger);
  }

  createRoutes() {
    const router = new Router('/elasticsearch');

    return registerElasticsearchRoutes(router, this.logger, this.service);
  }
}
