import type { UrlDrilldownScope } from './types';
export declare function validateUrlTemplate(url: string, scope: UrlDrilldownScope): Promise<{
    isValid: boolean;
    error?: string;
    invalidUrl?: string;
}>;
