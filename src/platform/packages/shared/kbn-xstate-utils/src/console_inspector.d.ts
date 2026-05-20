import type { InspectionEvent } from 'xstate';
declare global {
    var __XSTATE_LOGGER_ENABLED__: boolean;
    var toggleXstateInspector: () => void;
}
export declare const createConsoleInspector: () => (inspectionEvent: InspectionEvent) => void;
