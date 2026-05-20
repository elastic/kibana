import React from 'react';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
export { VisorMode } from './mode_selector';
export interface QuickSearchVisorProps {
    query: string;
    isSpaceReduced?: boolean;
    isVisible: boolean;
    onUpdateAndSubmitQuery: (query: string) => void;
    onToggleVisor: () => void;
    telemetryService?: ESQLEditorTelemetryService;
}
export declare const searchPlaceholder: string;
export declare function QuickSearchVisor({ query, isSpaceReduced, isVisible, onUpdateAndSubmitQuery, onToggleVisor, telemetryService, }: QuickSearchVisorProps): React.JSX.Element | null;
