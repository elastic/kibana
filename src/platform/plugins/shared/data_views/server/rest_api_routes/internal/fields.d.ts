import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { IBody, IQuery } from './fields_for';
export declare function calculateHash(srcBuffer: Buffer): string;
export declare const createHandler: (isRollupsEnabled: () => boolean) => RequestHandler<{}, IQuery, IBody>;
export declare const registerFields: (router: IRouter, isRollupsEnabled: () => boolean) => void;
