import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
export declare function hasLibraryItemWithTitle(title: string, contentManagement: ContentManagementPublicStart['client']): Promise<boolean>;
