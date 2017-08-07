import {
  ElasticsearchConfig,
  ElasticsearchClusterType
} from './ElasticsearchConfig';
import {
  createElasticsearchSchema,
  ElasticsearchConfigsSchema
} from './schema';
import { Env } from '../../config';

export class ElasticsearchConfigs {
  /**
   * @internal
   */
  static createSchema = createElasticsearchSchema;

  private readonly typedConfigs: Map<
    ElasticsearchClusterType,
    ElasticsearchConfig
  > = new Map();

  /**
   * @internal
   */
  constructor(private readonly config: ElasticsearchConfigsSchema, env: Env) {}

  /**
   * Provides Elasticsearch config required for specific cluster type.
   * @param type Type of the cluster to return config for.
   */
  forType(type: ElasticsearchClusterType) {
    if (!this.typedConfigs.has(type)) {
      this.typedConfigs.set(
        type,
        new ElasticsearchConfig(type, this.getClusterConfig(type))
      );
    }

    return this.typedConfigs.get(type)!;
  }

  /**
   * Returns cluster config based on its type.
   * @param clusterType Type of the cluster config is requested for.
   */
  private getClusterConfig(clusterType: string) {
    return this.config.tribe !== undefined && clusterType === 'data'
      ? this.config.tribe
      : this.config;
  }
}
