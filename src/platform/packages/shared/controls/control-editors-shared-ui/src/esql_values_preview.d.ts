import type { ReactElement } from 'react';
import React from 'react';
import type { ESQLColumn } from '@kbn/es-types';
export declare const ESQLValuesPreview: React.FC<{
    previewOptions: string[] | number[];
    previewColumns: ESQLColumn[];
    previewError?: Error;
    updateQuery: (column: string) => void;
    isQueryRunning: boolean;
    header?: ReactElement;
    useRange?: boolean;
}>;
