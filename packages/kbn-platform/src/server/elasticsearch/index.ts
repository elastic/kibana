import { Observable } from 'rxjs';

import { ElasticsearchService } from './ElasticsearchService';
import { ElasticsearchRequestHelpers } from './ElasticsearchFacade';
import { registerElasticsearchRoutes } from './api';
import { Router } from '../http';
import { ElasticsearchConfigs } from './ElasticsearchConfigs';
import { LoggerFactory } from '../../logging';

export {
  ElasticsearchService,
  ElasticsearchRequestHelpers,
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
    const router = new Router('/elasticsearch', {
      onRequest: req => new ElasticsearchRequestHelpers(this.service)
    });

    return registerElasticsearchRoutes(router, this.logger);
  }
}
