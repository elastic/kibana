// TODO inline all of these
import * as schemaLib from '../lib/schema';
import { ConfigService } from '../config';
import { HttpModule } from '../server/http';
import { KibanaModule } from '../server/kibana';
import { ElasticsearchModule } from '../server/elasticsearch';
import { LoggerFactory } from '../logging';

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

export interface CoreService {
  start(): Promise<void>;
  stop(): Promise<void>;
}
