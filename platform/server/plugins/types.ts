import { Observable } from 'rxjs';

import { As, Schema } from '../../types';
import * as schemaLib from '../../lib/schema';
import { ConfigWithSchema } from '../../config';
import { Router, RouterOptions } from '../http';
import { KibanaConfig } from '../kibana';
import { ElasticsearchService, ElasticsearchConfigs } from '../elasticsearch';
import { Logger } from '../../logging';

export type PluginName = string & As<'PluginName'>;

export interface KibanaPluginFeatures {
  /**
   * Plugin-scoped logger
   */
  logger: { get: (namespace?: string) => Logger };

  /**
   * Core Kibana utilities
   */
  util: {
    schema: Schema;
  };

  /**
   * Core Elasticsearch functionality
   */
  elasticsearch: {
    service: ElasticsearchService;
    config$: Observable<ElasticsearchConfigs>;
  };
  kibana: {
    config$: Observable<KibanaConfig>;
  };

  /**
   * Core HTTP functionality
   */
  http: {
    /**
     * Create and register a router at the specified path.
     *
     * The return value of the `onRequest` router option will be injected as the
     * first param in any route handler registered on the router.
     */
    createAndRegisterRouter: <T>(
      path: string,
      options: RouterOptions<T>
    ) => Router<T>;
  };

  /**
   * Core configuration functionality, enables fetching a subset of the config.
   */
  config: {
    /**
     * Reads the subset of the config at the specified `path` and validates it
     * against the schema created by calling the static `createSchema` on the
     * specified `ConfigClass`.
     *
     * @param path The path to the desired subset of the config.
     * @param ConfigClass A class (not an instance of a class) that contains a
     * static `createSchema` that will be called to create a schema that we
     * validate the config at the given `path` against.
     */
    create: <Schema extends schemaLib.Any, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config>;
    createIfExists: <Schema extends schemaLib.Any, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config | undefined>;
  };
}

export interface BasePluginsType {
  [key: string]: any;
}

export type KibanaFunctionalPlugin<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = (kibana: KibanaPluginFeatures, plugins: DependenciesType) => ExposableType;

// TODO We can't type the constructor, so we have no way of typing
// the `DependenciesType` in the same way as we do for `KibanaFunctionalPlugin`.
// UNLESS we create a class you can `import`, of course.
//
// From the TypeScript core team:
// > More formally, a class implementing an interface is a contract on what an
// > instance of the class has. Since an instance of a class won't contain a
// > construct signature, it cannot satisfy the interface.
//
// If we move these deps to `start` instead of the constructor there's another
// relevant issue regarding contextual typing, which means that all types must
// be explicitely listed in `start` in every plugin. See
// https://github.com/Microsoft/TypeScript/pull/10610 for a "dead-ish" WIP.
export interface KibanaPluginStatic<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> {
  new (kibana: KibanaPluginFeatures, plugins: DependenciesType): KibanaPlugin<
    ExposableType
  >;
}

export interface KibanaPlugin<ExposableType> {
  start(): ExposableType;

  stop?(): void;
}
