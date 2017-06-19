import { ElasticsearchConfig } from './ElasticsearchConfig';
import { createElasticsearchSchema, ElasticsearchConfigsSchema } from './schema';
import { ElasticsearchClusterType } from '../../types';

import { Env } from '../../env';

export class ElasticsearchConfigs {
  static createSchema = createElasticsearchSchema;

  private readonly configs: {
    [type in ElasticsearchClusterType]: ElasticsearchConfig
  }

  constructor(config: ElasticsearchConfigsSchema, env: Env) {
    this.configs = {
      data: config.tribe !== undefined
        ? new ElasticsearchConfig('data', config.tribe)
        : new ElasticsearchConfig('data', config),
      admin: new ElasticsearchConfig('admin', config)
    }
  }

  forType(type: ElasticsearchClusterType) {
    return this.configs[type];
  }
}
