import type { HttpSetup } from '@kbn/core/public';
export declare class HttpService {
    private client;
    setup(httpClient: HttpSetup): void;
    get httpClient(): HttpSetup;
}
export declare const httpService: HttpService;
