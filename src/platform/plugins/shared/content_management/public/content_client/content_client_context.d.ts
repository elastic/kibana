import type { FC, PropsWithChildren } from 'react';
import type { ContentClient } from './content_client';
export declare const useContentClient: () => ContentClient;
export declare const ContentClientProvider: FC<PropsWithChildren<{
    contentClient: ContentClient;
}>>;
