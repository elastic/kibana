import type { UrlDrilldownScope } from './types';
export declare function validateUrl(url: string): {
    isValid: boolean;
    error?: string;
    invalidUrl?: string;
};
export declare function validateUrlTemplate(url: string, scope: UrlDrilldownScope): Promise<{
    isValid: boolean;
    error?: string;
    invalidUrl?: string;
}>;
