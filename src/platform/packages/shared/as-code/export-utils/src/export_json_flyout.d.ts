import React from 'react';
import type { SanitizeStateFunction } from './types';
type NoSanitizedState = void & {};
export declare const ExportJsonFlyout: <State extends object, SanitizedState extends object = NoSanitizedState>({ apiPath, closeFlyout, sanitizeState, }: SanitizedState extends NoSanitizedState ? {
    apiPath: string;
    closeFlyout: () => void;
    sanitizeState?: undefined;
} : {
    apiPath: string;
    closeFlyout: () => void;
    sanitizeState: SanitizeStateFunction<State, SanitizedState>;
}) => React.JSX.Element;
export {};
