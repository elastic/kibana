import type { HttpSetup } from '@kbn/core/public';
import type { EsConfigApiResponse } from '../../../common/types/api_responses';
interface Dependencies {
    http: HttpSetup;
}
export type Api = ReturnType<typeof createApi>;
export declare const createApi: ({ http }: Dependencies) => {
    getEsConfig: () => Promise<import("../../shared_imports").SendRequestResponse<EsConfigApiResponse, any>>;
};
export {};
