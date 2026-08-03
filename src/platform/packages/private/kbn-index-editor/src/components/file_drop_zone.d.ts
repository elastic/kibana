import type { PropsWithChildren } from 'react';
import React, { type FC } from 'react';
export interface FileSelectorContextType {
    onFileSelectorClick: () => void;
}
export declare const FileSelectorContext: React.Context<FileSelectorContextType>;
export declare const useFileSelectorContext: () => FileSelectorContextType;
export declare const FileDropzone: FC<PropsWithChildren<{
    noResults: boolean;
}>>;
