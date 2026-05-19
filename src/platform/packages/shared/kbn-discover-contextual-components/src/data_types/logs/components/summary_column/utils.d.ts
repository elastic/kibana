import React from 'react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ReactNode } from 'react';
import type { TraceDocument } from '@kbn/discover-utils/src';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldBadgeWithActionsProps } from '../cell_actions_popover';
type FieldKey = keyof DataTableRecord['flattened'];
type FieldValue = NonNullable<DataTableRecord['flattened'][FieldKey]>;
export interface ResourceFieldDescriptor {
    ResourceBadge: React.ComponentType<FieldBadgeWithActionsProps>;
    Icon?: () => JSX.Element;
    name: string;
    formattedValue: ReactNode;
    textValue: string;
    property?: DataViewField;
    rawValue: unknown;
}
export declare const isTraceDocument: (row: DataTableRecord) => row is TraceDocument;
interface ResourceFieldsProps {
    row: DataTableRecord;
    fields: readonly FieldKey[];
    getAvailableFields: (doc: Readonly<Record<FieldKey, FieldValue>>) => FieldKey[];
    dataView: DataView;
    core: CoreStart;
    share?: SharePluginStart;
    fieldFormats: FieldFormatsStart;
}
export declare const createResourceFields: ({ row, fields, getAvailableFields, dataView, core, share, fieldFormats, }: ResourceFieldsProps) => ResourceFieldDescriptor[];
/**
 * Enhanced version that uses OTel field fallbacks and returns resource fields with actual field names.
 * This ensures badges display the correct field names (e.g., 'resource.attributes.service.name'
 * instead of 'service.name' when the document uses OTel format).
 */
export declare const createResourceFieldsWithOtelFallback: ({ row, dataView, core, share, fieldFormats, }: Omit<ResourceFieldsProps, "fields" | "getAvailableFields">) => ResourceFieldDescriptor[];
/**
 * formatJsonDocumentForContent definitions
 */
export declare const formatJsonDocumentForContent: (row: DataTableRecord) => {
    flattened: Record<string, unknown>;
    raw: {
        fields: Record<string, any>;
        _index?: string;
        _id?: string | undefined;
        _source?: Record<string, unknown> | undefined;
        sort?: import("@elastic/elasticsearch/lib/api/types").SortResults | undefined;
        highlight?: Record<string, string[]> | undefined;
        inner_hits?: Record<string, import("@elastic/elasticsearch/lib/api/types").SearchInnerHitsResult> | undefined;
        _seq_no?: import("@elastic/elasticsearch/lib/api/types").SequenceNumber | undefined;
        _primary_term?: import("@elastic/elasticsearch/lib/api/types").long | undefined;
        _routing?: string | undefined;
        _score?: (import("@elastic/elasticsearch/lib/api/types").double | null) | undefined;
        _version?: import("@elastic/elasticsearch/lib/api/types").VersionNumber | undefined;
        _ignored?: string[] | undefined;
        _explanation?: import("@elastic/elasticsearch/lib/api/types").ExplainExplanation | undefined;
        matched_queries?: (string[] | Record<string, import("@elastic/elasticsearch/lib/api/types").double>) | undefined;
        _nested?: import("@elastic/elasticsearch/lib/api/types").SearchNestedIdentity | undefined;
        ignored_field_values?: Record<string, any[]> | undefined;
        _shard?: string | undefined;
        _node?: string | undefined;
        _rank?: import("@elastic/elasticsearch/lib/api/types").integer | undefined;
    };
    id: string;
    isAnchor?: boolean;
};
export declare const isFieldAllowed: (field: string) => boolean;
export {};
