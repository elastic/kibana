import React from 'react';
import type { ExportJsonSharingData, SanitizeStateFunction } from './types';
type NoSanitizedState = void & {};
export declare const ExportJsonFlyout: <State extends object, SanitizedState extends object = NoSanitizedState>({ title, objectType, closeFlyout, getExportJson, isByReference, apiPath, sanitizeState, }: ExportJsonSharingData<State> & {
    isByReference?: boolean;
    objectType: string;
    closeFlyout: () => void;
    apiPath?: string;
    sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}) => React.JSX.Element;
export {};
