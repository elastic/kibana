export {
  KibanaFunctionalPlugin,
  KibanaPlugin,
  KibanaPluginFeatures
} from '../../../platform/server/plugins/types';
export { Logger, LoggerFactory } from '../../../platform/logging';
export { ElasticsearchService } from '../../../platform/server/elasticsearch';
export { KibanaConfig } from '../../../platform/server/kibana';
export { KibanaRequest, Router } from '../../../platform/server/http';
export { KibanaError } from '../../../platform/lib/Errors';
import * as schemaLib from '../../../platform/lib/schema';

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
