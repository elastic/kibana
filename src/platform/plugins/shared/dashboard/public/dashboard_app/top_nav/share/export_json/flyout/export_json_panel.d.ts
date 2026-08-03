import React from 'react';
import type { ExportJsonSanitizedState } from './types';
export type ExportJsonPanelProps<SanitizedState extends object> = ExportJsonSanitizedState<SanitizedState> & {
    apiPath?: string;
    onRetry: () => void;
};
export declare const ExportJsonPanel: <State extends object, SanitizedState extends object>({ apiPath, status, data, warnings, error, onRetry, }: ExportJsonPanelProps<SanitizedState>) => React.JSX.Element;
