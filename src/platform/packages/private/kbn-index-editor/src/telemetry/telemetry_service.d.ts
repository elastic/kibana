import type { AnalyticsServiceStart } from '@kbn/core/server';
export declare class IndexEditorTelemetryService {
    private _analytics;
    private _flyoutMode;
    private _triggerSource;
    constructor(analytics: AnalyticsServiceStart, canEditIndex: boolean, doesIndexExists: boolean, triggerSource: string);
    private reportEvent;
    trackFlyoutOpened(eventData: {
        docCount: number;
        fieldCount: number;
    }): void;
    trackSaveSubmitted(eventData: {
        pendingRowsAdded: number;
        pendingColsAdded: number;
        pendingCellsEdited: number;
        action: 'save' | 'save_and_exit';
        outcome: 'success' | 'error';
        latency: number;
    }): void;
    trackEditInteraction(eventData: {
        actionType: 'edit_cell' | 'edit_column' | 'add_row' | 'add_column' | 'delete_row' | 'delete_column';
        failureReason?: string;
    }): void;
    trackQueryThisIndexClicked(query: string): void;
    trackResetIndex(outcome?: 'success' | 'error'): void;
    private getFlyoutMode;
}
