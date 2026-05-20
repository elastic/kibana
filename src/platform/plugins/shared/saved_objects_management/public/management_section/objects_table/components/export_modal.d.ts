import type { FC } from 'react';
export interface ExportModalProps {
    onExport: () => void;
    onCancel: () => void;
    onSelectedOptionsChange: (newSelectedOptions: Record<string, boolean>) => void;
    filteredItemCount: number;
    options: Array<{
        id: string;
        label: string;
    }>;
    selectedOptions: Record<string, boolean>;
    includeReferences: boolean;
    onIncludeReferenceChange: (newIncludeReference: boolean) => void;
}
export declare const ExportModal: FC<ExportModalProps>;
