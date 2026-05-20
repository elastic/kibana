import type { Api } from './api';
/**
 * Service for managing ES host information.
 *
 * This holds the current ES host (used for copy as cURL functionality)
 * and the list of all available hosts (used for host selection dropdown).
 */
export declare class EsHostService {
    private readonly api;
    private host;
    private allHosts;
    private initialized;
    private initPromise;
    constructor(api: Api);
    private setHost;
    private setAllHosts;
    /**
     * Initialize the host values based on the values set on the server.
     *
     * This call is necessary because these values can only be retrieved at
     * runtime.
     */
    init(): Promise<void>;
    private doInit;
    getHost(): string;
    getAllHosts(): string[];
    isInitialized(): boolean;
    /**
     * Wait for the service to be initialized before using it
     */
    waitForInitialization(): Promise<void>;
}
export declare const createEsHostService: ({ api }: {
    api: Api;
}) => EsHostService;
