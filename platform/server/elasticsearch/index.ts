import { Observable } from '@elastic/kbn-observable';

import { ElasticsearchService } from './ElasticsearchService';
import { registerElasticsearchRoutes } from './api';
import { Router } from '../http';
import { ElasticsearchConfigs } from './ElasticsearchConfigs';
import { LoggerFactory } from '../../logging';

export { ElasticsearchClusterType } from './ElasticsearchConfig';
export { AdminClient } from './AdminClient';
export { ScopedDataClient } from './ScopedDataClient';
export {
  ElasticsearchService,
  ElasticsearchConfigs
};

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
