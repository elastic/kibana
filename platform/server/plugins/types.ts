import { As } from '../../types/as';
import { Schema } from '../../types/schema';
import * as schemaLib from '../../lib/schema';
import { Observable as EsObservable } from 'kbn-observable';
import { ConfigWithSchema } from '../../config';
import { Router, RouterOptions } from '../http';
import { KibanaConfig } from '../kibana';
import { ElasticsearchService, ElasticsearchConfigs } from '../elasticsearch';
import { LoggerFactory } from '../../logging';

export type PluginName = string & As<'PluginName'>;

export interface KibanaPluginFeatures {
  /**
   * Plugin-scoped logger
   */
  logger: LoggerFactory;

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
    config$: EsObservable<ElasticsearchConfigs>;
  };
  kibana: {
    config$: EsObservable<KibanaConfig>;
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
    ) => EsObservable<Config>;
    createIfExists: <Schema extends schemaLib.Any, Config>(
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => EsObservable<Config | undefined>;
  };
}

export interface BasePluginsType {
  [key: string]: any;
}

export type KibanaPluginConfig<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = {
  configPath?: string | Array<string>;
  dependencies?: Array<string>;
  plugin:
    | KibanaFunctionalPlugin<DependenciesType, ExposableType>
    | KibanaClassPluginStatic<DependenciesType, ExposableType>;
};

/**
 * 
 */
export type KibanaFunctionalPlugin<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = (kibana: KibanaPluginFeatures, plugins: DependenciesType) => ExposableType;

/**
 * Defines the "static side" of the Kibana class plugin.
 * 
 * When a class implements an interface, only the instance side of the class is
 * checked, so you can't include static methods there. Because of that we have
 * a seprate interface for the static side, which we can use to specify that we
 * want a _class_ (not an instance) that matches this interface.
 * 
 * See https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes 
 */
export interface KibanaClassPluginStatic<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> {
  new (
    kibana: KibanaPluginFeatures,
    plugins: DependenciesType
  ): KibanaClassPlugin<ExposableType>;
}

/**
 * The interface for an instance of a Kibana class plugin.
 */
export interface KibanaClassPlugin<ExposableType> {
  start(): ExposableType;

  stop?(): void;
}
