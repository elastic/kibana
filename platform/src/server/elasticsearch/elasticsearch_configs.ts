import {
  ElasticsearchConfig,
  ElasticsearchClusterType,
} from './elasticsearch_config';
import { elasticsearchSchema, ElasticsearchConfigsSchema } from './schema';
import { Env } from '../../config';

export class ElasticsearchConfigs {
  /**
   * @internal
   */
  static schema = elasticsearchSchema;

  private readonly configs: {
    [type in ElasticsearchClusterType]: ElasticsearchConfig
  };

  /**
   * @internal
   */
  constructor(config: ElasticsearchConfigsSchema, env: Env) {
    this.configs = {
      data:
        config.tribe !== undefined
          ? new ElasticsearchConfig('data', config.tribe)
          : new ElasticsearchConfig('data', config),
      admin: new ElasticsearchConfig('admin', config),
    };
  }

  forType(type: ElasticsearchClusterType) {
    return this.configs[type];
  }
}
