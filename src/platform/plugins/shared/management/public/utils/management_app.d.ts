import type { CreateManagementItemArgs, Mount } from '../types';
import { ManagementItem } from './management_item';
export type ManagementAppPaddingSize = 'none' | 's' | 'm' | 'l';
export interface RegisterManagementAppArgs extends CreateManagementItemArgs {
    mount: Mount;
    basePath: string;
    keywords?: string[];
    /**
     * Opt-in override for the `KibanaPageTemplate` main section padding. When left
     * unset, the template's own default padding is used, so most apps should not
     * need to set this.
     */
    mainPaddingSize?: ManagementAppPaddingSize;
}
export declare class ManagementApp extends ManagementItem {
    readonly mount: Mount;
    readonly basePath: string;
    readonly keywords: string[];
    readonly mainPaddingSize?: ManagementAppPaddingSize;
    constructor(args: RegisterManagementAppArgs);
}
