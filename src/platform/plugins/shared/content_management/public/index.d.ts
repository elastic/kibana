import { ContentManagementPlugin } from './plugin';
export type { CrudClient } from './crud_client';
export { ContentClientProvider, ContentClient, useCreateContentMutation, useUpdateContentMutation, useDeleteContentMutation, useSearchContentQuery, useGetContentQuery, useContentClient, type QueryOptions, } from './content_client';
export declare function plugin(): ContentManagementPlugin;
export type { ContentManagementPublicStart, ContentManagementPublicSetup } from './types';
