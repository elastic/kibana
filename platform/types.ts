import { Observable } from 'rxjs';

/**
 * TypeScript's type system is structural, but for some use-cases we want to be
 * able to create "branded types", e.g. create two types `Id` and `PluginName`
 * and make sure we don't use one in place of the other. (i.e. we want a hint of
 * nominal typing in TypeScript).
 *
 * For example, if we create two types
 *
 * ```
 * type Id = string;
 * type PluginName = string;
 * ```
 *
 * We can (by design) inject `PluginName` instead of `Id` anywhere, because they
 * are _structurally_ the same, e.g.:
 *
 * ```
 * function onlyAcceptId(id: Id) { ... }
 *
 * const pluginName = 'foo' as PluginName;
 * onlyAcceptId(pluginName); // OK because structurally checked
 * ```
 *
 * However, with the `As` helper below we can "brand" (or "tag") the types, e.g.
 *
 * ```
 * type Id = string & As<'Id'>;
 * type PluginName = string & As<'PluginName'>;
 * ```
 *
 * Now we can no longer inject `PluginName` instead of `Id`, as TypeScript will
 * complain with:
 *
 * > Type '"PluginName"' is not assignable to type '"Id"'.
 *
 * To use this we have to first define our type (`Id` and `PluginName` above),
 * then to create a variable with the type we have to use a Type assertion
 * ("cast the variable"):
 *
 * ```
 * const myId = 'some-id' as Id; // the `as Id` asserts this is an `Id`
 * ```
 *
 * There is some discussion on this topic in:
 * - https://github.com/Microsoft/TypeScript/issues/4895
 * - https://github.com/Microsoft/TypeScript/issues/202
 *
 * You can also see a similar approach in the TypeScript code base itself:
 * https://github.com/Microsoft/TypeScript/blob/7b48a182c05ea4dea81bab73ecbbe9e013a79e99/src/compiler/types.ts#L693-L698
 *
 * As they write there:
 *
 * > By using the 'brands' we ensure that the type checker actually thinks you
 * > have something of the right type. [...] At runtime they have zero cost.
 */
export declare class As<S extends string> {
   private as: S;
}

// TODO inline all of these
import * as schemaLib from './lib/schema';
import { ConfigService, Env } from './config';
import { Router, RouterOptions, HttpModule } from './server/http';
import { KibanaConfig, KibanaModule } from './server/kibana';
import {
  ElasticsearchService,
  ElasticsearchConfigs,
  ElasticsearchModule
} from './server/elasticsearch';
import { LoggerFactory } from './logger';

export type ElasticsearchClusterType = 'data' | 'admin';

export type Schema = typeof schemaLib;

// TODO
// This _can't_ be part of the types, as it has to be available at runtime.
// It was the only way I was able to grab the return type of `createSchema` in
// the configs in a good way for the constructor. Relevant TS issues to solve
// this at the type level:
// https://github.com/Microsoft/TypeScript/issues/6606
// https://github.com/Microsoft/TypeScript/issues/14400
export function typeOfSchema<RT extends schemaLib.Any>(
  fn: (...rest: any[]) => RT
): schemaLib.TypeOf<RT> {
  return undefined;
}

export interface KibanaCoreModules {
  elasticsearch: ElasticsearchModule;
  kibana: KibanaModule;
  http: HttpModule;
  configService: ConfigService;
  logger: LoggerFactory;
}

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
    atPath: <Schema extends schemaLib.Any, Config>(
      path: string | string[],
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config>;
    optionalAtPath: <Schema extends schemaLib.Any, Config>(
      path: string | string[],
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config | undefined>;
  };
}

/**
 * Interface that defines the static side of a config class.
 *
 * (Remember that a class has two types: the type of the static side and the
 * type of the instance side, see https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes)
 *
 * This can't be used to define the config class because of how interfaces work
 * in TypeScript, but it can be used to ensure we have a config class that
 * matches whenever it's used.
 */
export interface ConfigWithSchema<S extends schemaLib.Any, Config> {
  /**
   * Any config class must define a schema that validates the config, based on
   * the injected `schema` helper.
   */
  createSchema: (schema: Schema) => S;

  /**
   * @param validatedConfig The result from calling the static `createSchema`
   * above. This config is validated before the config class is instantiated.
   * @param env An instance of the `Env` class that defines environment specific
   * variables.
   */
  new (validatedConfig: schemaLib.TypeOf<S>, env: Env): Config;
}

export interface CoreService {
  start(): Promise<void>;
  stop(): Promise<void>;
}