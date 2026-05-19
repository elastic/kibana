import type { CspAdditionalConfig } from '../csp';
export interface Input {
    url?: null | string;
}
export declare class CdnConfig {
    private readonly url;
    constructor(url?: null | string);
    get host(): undefined | string;
    get baseHref(): undefined | string;
    getCspConfig(): CspAdditionalConfig;
    static from(input?: Input): CdnConfig;
}
