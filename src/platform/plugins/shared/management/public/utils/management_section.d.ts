import type { Assign } from '@kbn/utility-types';
import type { CreateManagementItemArgs, ManagementSectionId } from '../types';
import { ManagementItem } from './management_item';
import type { RegisterManagementAppArgs } from './management_app';
import { ManagementApp } from './management_app';
export type RegisterManagementSectionArgs = Assign<CreateManagementItemArgs, {
    id: ManagementSectionId | string;
}>;
export declare class ManagementSection extends ManagementItem {
    readonly apps: ManagementApp[];
    constructor(args: RegisterManagementSectionArgs);
    registerApp(args: Omit<RegisterManagementAppArgs, 'basePath'>): ManagementApp;
    getApp(id: ManagementApp['id']): ManagementApp | undefined;
    getAppsEnabled(): ManagementApp[];
}
