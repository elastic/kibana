import type { AnalyticsServiceStart } from '@kbn/core/server';
import { QuerySource } from '@kbn/esql-types';
import type { TelemetryQuerySubmittedProps, ESQLVariableType, ControlTriggerSource, TelemetryLatencyProps } from '@kbn/esql-types';
import type { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
export declare enum ResourceBrowserType {
    DATA_SOURCES = "data_sources",
    FIELDS = "fields"
}
export declare enum ResourceBrowserOpenedFrom {
    AUTOCOMPLETE = "autocomplete",
    BADGE = "badge"
}
export declare class ESQLEditorTelemetryService {
    private readonly _analytics;
    constructor(_analytics: AnalyticsServiceStart);
    private _reportEvent;
    private _reportPerformanceEvent;
    private _buildBaseLatencyEvent;
    /**
     * Receives an hover message content.
     * If it corresponds to a lookup index action, the event is tracked.
     *
     * Example of hover message:
     * `[Create index](command:esql.lookup_index.create?%7B%22indexName%22%3A%22my_index%22%2C%22doesIndexExist%22%3Afalse%2C%22canEditIndex%22%3Afalse%2C%22triggerSource%22%3A%22esql_hover%22%7D)`
     *
     * @param hoverMessage The hover message content.
     * @returns
     */
    trackLookupJoinHoverActionShown(hoverMessage: string): void;
    trackSuggestionsWithCustomCommandShown(commandIds: string[]): void;
    private _determineTriggerAction;
    trackQueryHistoryOpened(isOpen: boolean): void;
    trackQueryHistoryClicked(isStarredQuery?: boolean): void;
    trackQuerySubmitted({ source, query }: TelemetryQuerySubmittedProps): void;
    trackRecommendedQueryClicked(source: QuerySource.HELP | QuerySource.AUTOCOMPLETE, label: string): void;
    trackEsqlControlFlyoutOpened(prefilled: boolean, controlType: ESQLVariableType, triggerSource: ControlTriggerSource, query: string): void;
    trackEsqlControlConfigSaved(controlType: ESQLVariableType, triggerSource: ControlTriggerSource): void;
    trackEsqlControlConfigCancelled(controlType: ESQLVariableType, reason: string): void;
    trackResourceBrowserOpened(payload: {
        browserType: ResourceBrowserType;
        openedFrom: ResourceBrowserOpenedFrom;
    }): void;
    trackResourceBrowserItemToggled(payload: {
        browserType: ResourceBrowserType;
        openedFrom: ResourceBrowserOpenedFrom;
        action: DataSourceSelectionChange;
    }): void;
    trackInitLatency(duration: number, sessionId?: string): void;
    trackInputLatency(payload: TelemetryLatencyProps): void;
    trackSuggestionsLatency(payload: TelemetryLatencyProps): void;
    trackValidationLatency(payload: TelemetryLatencyProps): void;
}
