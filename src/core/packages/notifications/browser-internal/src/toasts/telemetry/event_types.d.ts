import { type EventTypeOpts } from '@elastic/ebt/client';
export declare enum EventMetric {
    TOAST_DISMISSED = "global_toast_list_toast_dismissed"
}
export declare enum FieldType {
    RECURRENCE_COUNT = "toast_deduplication_count",
    TOAST_MESSAGE = "toast_message",
    TOAST_MESSAGE_TYPE = "toast_message_type"
}
export declare const eventTypes: Array<EventTypeOpts<Record<string, unknown>>>;
