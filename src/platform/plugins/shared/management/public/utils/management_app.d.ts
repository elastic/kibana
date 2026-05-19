import type { CreateManagementItemArgs, Mount } from '../types';
import { ManagementItem } from './management_item';
export interface RegisterManagementAppArgs extends CreateManagementItemArgs {
    mount: Mount;
    basePath: string;
    keywords?: string[];
}
export declare class ManagementApp extends ManagementItem {
    readonly mount: Mount;
    readonly basePath: string;
    readonly keywords: string[];
    constructor(args: RegisterManagementAppArgs);
}
