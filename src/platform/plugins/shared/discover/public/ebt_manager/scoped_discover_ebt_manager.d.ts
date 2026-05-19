import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { Request as InspectedRequest } from '@kbn/inspector-plugin/public';
import { type TabsEBTEvent } from '@kbn/unified-tabs';
import { type DiscoverInDashboardEBTEvent } from './discover_in_dashboard_event_definition';
import { type CascadeEBTEvent } from '../application/main/components/layout/cascaded_documents/telemetry/event_definition';
import { ContextualProfileLevel } from '../context_awareness';
import type { ReportEvent, ReportPerformanceEvent, SetAsActiveManager, UpdateProfilesContextWith } from './types';
export declare const NON_ECS_FIELD = "<non-ecs>";
export declare const FREE_TEXT = "__FREE_TEXT__";
type FilterOperation = '+' | '-' | '_exists_';
export declare class ScopedDiscoverEBTManager {
    private readonly reportEvent;
    private readonly reportPerformanceEvent;
    readonly updateProfilesContextWith: UpdateProfilesContextWith;
    readonly setAsActiveManager: SetAsActiveManager;
    private lastResolvedContextProfiles;
    private queryAnalysisCache;
    constructor(reportEvent: ReportEvent | undefined, reportPerformanceEvent: ReportPerformanceEvent | undefined, updateProfilesContextWith: UpdateProfilesContextWith, setAsActiveManager: SetAsActiveManager);
    private getFieldsFromMetadata;
    private trackFieldUsageEvent;
    trackDataTableSelection({ fieldName, fieldsMetadata, }: {
        fieldName: string;
        fieldsMetadata: FieldsMetadataPublicStart | undefined;
    }): Promise<void>;
    trackDataTableRemoval({ fieldName, fieldsMetadata, }: {
        fieldName: string;
        fieldsMetadata: FieldsMetadataPublicStart | undefined;
    }): Promise<void>;
    trackFilterAddition({ fieldName, fieldsMetadata, filterOperation, }: {
        fieldName: string;
        fieldsMetadata: FieldsMetadataPublicStart | undefined;
        filterOperation: FilterOperation;
    }): Promise<void>;
    private trackQueryFieldsUsageEvent;
    trackSubmittingQuery({ query, fieldsMetadata, }: {
        query: Query | AggregateQuery | undefined;
        fieldsMetadata: FieldsMetadataPublicStart | undefined;
    }): Promise<void>;
    trackContextualProfileResolvedEvent({ contextLevel, profileId, }: {
        contextLevel: ContextualProfileLevel;
        profileId: string;
    }): void;
    trackPerformanceEvent(eventName: string): {
        reportEvent: (eventData?: Omit<PerformanceMetricEvent, "eventName" | "duration">) => void;
    };
    trackQueryPerformanceEvent(eventName: string): {
        startTime: number;
        reportEvent: ({ queryRangeSeconds, requests, }: {
            queryRangeSeconds: number;
            requests?: InspectedRequest[];
        }, otherEventData?: Omit<PerformanceMetricEvent, "eventName" | "duration">) => void;
    };
    trackTabsEvent({ eventName, ...payload }: TabsEBTEvent): void;
    trackCascadeEvent({ eventName, ...payload }: CascadeEBTEvent): void;
    trackDiscoverToDashboardEvent({ eventName, ...payload }: DiscoverInDashboardEBTEvent): void;
}
export {};
