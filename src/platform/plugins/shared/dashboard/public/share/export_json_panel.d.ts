import React from 'react';
import type { ExportJsonSanitizedState } from './types';
export type ExportJsonPanelProps = ExportJsonSanitizedState & {
    onRetry: () => void;
};
export declare const ExportJsonPanel: ({ status, data, warnings, error, onRetry, }: ExportJsonPanelProps) => React.JSX.Element;
