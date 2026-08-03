import React, { type FC, type PropsWithChildren } from 'react';
import type { BaseFilesClient as FilesClient } from '@kbn/shared-ux-file-types';
export interface FilesContextValue {
    /**
     * A files client that will be used process uploads.
     */
    client: FilesClient<any>;
}
export declare const useFilesContext: () => FilesContextValue;
interface ContextProps {
    /**
     * A files client that will be used process uploads.
     */
    client: FilesClient<any>;
    children: React.ReactNode;
}
export declare const FilesContext: FC<PropsWithChildren<ContextProps>>;
export {};
