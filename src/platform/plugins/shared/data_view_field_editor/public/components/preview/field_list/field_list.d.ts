import React from 'react';
import type { FieldPreview } from '../types';
export type DocumentField = FieldPreview & {
    isPinned?: boolean;
};
interface Props {
    height: number;
    clearSearch: () => void;
    searchValue?: string;
}
export declare const PreviewFieldList: React.FC<Props>;
export {};
