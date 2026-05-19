import { type MutableRefObject } from 'react';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
interface InitLatencyTrackingDeps {
    telemetryService: ESQLEditorTelemetryService;
    sessionIdRef: MutableRefObject<string>;
}
export declare const useInitLatencyTracking: ({ telemetryService, sessionIdRef, }: InitLatencyTrackingDeps) => {
    reportInitLatency: () => void;
};
interface InputLatencyTrackingDeps {
    telemetryService: ESQLEditorTelemetryService;
    sessionIdRef: MutableRefObject<string>;
    interactionIdRef: MutableRefObject<number>;
}
export declare const useInputLatencyTracking: ({ telemetryService, sessionIdRef, interactionIdRef, }: InputLatencyTrackingDeps) => {
    trackInputLatencyOnKeystroke: (queryText: string) => void;
    reportInputLatency: () => void;
};
interface SuggestionsLatencyTrackingDeps {
    telemetryService: ESQLEditorTelemetryService;
    sessionIdRef: MutableRefObject<string>;
    interactionIdRef: MutableRefObject<number>;
}
export declare const useSuggestionsLatencyTracking: ({ telemetryService, sessionIdRef, interactionIdRef, }: SuggestionsLatencyTrackingDeps) => {
    onSuggestionsReady: (computeStart: number, computeEnd: number, queryLength: number, queryLines: number) => void;
    resetSuggestionsTracking: () => void;
};
interface ValidationLatencyTrackingDeps {
    telemetryService: ESQLEditorTelemetryService;
    sessionIdRef: MutableRefObject<string>;
    interactionIdRef: MutableRefObject<number>;
}
export declare const useValidationLatencyTracking: ({ telemetryService, sessionIdRef, interactionIdRef, }: ValidationLatencyTrackingDeps) => {
    trackValidationLatencyStart: (queryText: string) => void;
    trackValidationLatencyEnd: (active: boolean, callbacksDuration?: number) => void;
    resetValidationTracking: () => void;
};
export {};
