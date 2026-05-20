import type { ReactNode } from 'react';
import React from 'react';
import type { Props } from './file_upload';
export type { DoneNotification } from './upload_state';
export type FileUploadProps = Props & {
    /**
     * A custom fallback for when component is lazy loading,
     * If not provided, <EuiLoadingSpinner /> is used
     */
    lazyLoadFallback?: ReactNode;
};
export declare const FileUpload: (props: FileUploadProps) => React.JSX.Element;
