import { Observable } from '@elastic/kbn-observable';
import { schema } from '@elastic/kbn-sdk';

import { ConfigWithSchema } from '../../config';
import { Router } from '../http';
import { KibanaConfig } from '../kibana';
import { ElasticsearchService, ElasticsearchConfigs } from '../elasticsearch';
import { LoggerFactory } from '../../logging';

export interface KibanaPluginApi {
  /**
   * Plugin-scoped logger
   */
  logger: LoggerFactory;

  /**
   * Core Elasticsearch functionality
   */
  elasticsearch: {
    service: ElasticsearchService;
    config$: Observable<ElasticsearchConfigs>;
  };

  /**
   * Core Kibana functionality
   */
  kibana: {
    config$: Observable<KibanaConfig>;
  };

  /**
   * Core HTTP functionality
   */
  http: {
    /**
     * Create and register a router at the specified path.
     */
    createAndRegisterRouter: (path: string) => Router;
  };

  /**
   * Core configuration functionality, enables fetching a subset of the config.
   */
  config: {
    /**
     * Reads the subset of the config at the specified `path` and validates it
     * against the schema in the static `schema` on the given `ConfigClass`.
     *
     * @param path The path to the desired subset of the config.
     * @param ConfigClass A class (not an instance of a class) that contains a
     * static `schema` that we validate the config at the given `path` against.
     */
    create: <Schema extends schema.Any, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config>;
    createIfExists: <Schema extends schema.Any, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config | undefined>;
  };
}
