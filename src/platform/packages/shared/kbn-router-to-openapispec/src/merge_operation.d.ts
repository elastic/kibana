import type { OpenAPIV3 } from 'openapi-types';
import type { DeepPartial, MaybePromise } from '@kbn/utility-types';
import type { CustomOperationObject } from './type';
export declare function mergeOperation(pathToSpecOrSpec: string | MaybePromise<DeepPartial<OpenAPIV3.OperationObject>>, operation: CustomOperationObject): Promise<void>;
