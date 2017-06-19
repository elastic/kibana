import { Observable } from 'rxjs';

// TODO inline all of these
import * as schema from './lib/schema';
import { ConfigService } from './config';
import { Router, RouterOptions, HttpModule } from './server/http';
import { KibanaConfig, KibanaModule } from './server/kibana';
import {
  ElasticsearchService,
  ElasticsearchConfigs,
  ElasticsearchModule
} from './server/elasticsearch';
import { Env } from './env';
import { LoggerFactory } from './logger';

export type ElasticsearchClusterType = 'data' | 'admin';

export type Schema = typeof schema;

// TODO
// This _can't_ be part of the types, as it has to be available at runtime.
// It was the only way I was able to grab the return type of `createSchema` in
// the configs in a good way for the constructor. Relevant TS issues to solve
// this at the type level:
// https://github.com/Microsoft/TypeScript/issues/6606
// https://github.com/Microsoft/TypeScript/issues/14400
export function typeOfSchema<RT extends schema.Any>(
  fn: (...rest: any[]) => RT
): schema.TypeOf<RT> {
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
  logger: LoggerFactory;
  util: {
    schema: Schema;
  };
  elasticsearch: {
    service: ElasticsearchService;
    config$: Observable<ElasticsearchConfigs>;
  };
  kibana: {
    config$: Observable<KibanaConfig>;
  };
  http: {
    createAndRegisterRouter: <T>(
      path: string,
      options: RouterOptions<T>
    ) => Router<T>;
  };
  config: {
    atPath: <Schema extends schema.Any, Config>(
      path: string | string[],
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config>;
    optionalAtPath: <Schema extends schema.Any, Config>(
      path: string | string[],
      ConfigClass: ConfigWithSchema<Schema, Config>
    ) => Observable<Config | undefined>;
  };
}

export interface ConfigWithSchema<Schema extends schema.Any, Config> {
  createSchema: (s: typeof schema) => Schema;

  // require that the constructor matches the schema
  new (val: schema.TypeOf<Schema>, env: Env): Config;
}
