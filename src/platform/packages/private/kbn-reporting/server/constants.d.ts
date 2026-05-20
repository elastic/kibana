export declare const PLUGIN_ID = "reporting";
export declare const REPORTING_DATA_STREAM_ALIAS = ".kibana-reporting";
export declare const REPORTING_DATA_STREAM_WILDCARD = ".kibana-reporting*";
export declare const REPORTING_LEGACY_INDICES = ".reporting-*";
export declare const REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY = ".reporting-*,.kibana-reporting*";
export declare const REPORTING_DATA_STREAM_COMPONENT_TEMPLATE = "kibana-reporting@custom";
export declare const REPORTING_DATA_STREAM_INDEX_TEMPLATE = ".kibana-reporting";
export declare const REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD = "template_version";
export declare const API_USAGE_COUNTER_TYPE = "reportingApi";
export declare const API_USAGE_ERROR_TYPE = "reportingApiError";
export declare enum EventType {
    REPORT_CREATION = "report_creation",
    REPORT_CLAIM = "report_claim",
    REPORT_COMPLETION_CSV = "report_completion_csv",
    REPORT_COMPLETION_SCREENSHOT = "report_completion_screenshot",
    REPORT_ERROR = "report_error",
    REPORT_DOWNLOAD = "report_download",
    REPORT_DELETION = "report_deletion",
    REPORT_NOTIFICATION = "report_notification",
    REPORT_NOTIFICATION_ERROR = "report_notification_error"
}
export declare enum FieldType {
    REPORT_ID = "report_id",
    SCHEDULED_TASK_ID = "scheduled_task_id",
    EXPORT_TYPE = "export_type",
    OBJECT_TYPE = "object_type",
    SCHEDULE_TYPE = "schedule_type",
    IS_DEPRECATED = "is_deprecated",
    IS_PUBLIC_API = "is_public_api",
    DURATION_MS = "duration_ms",
    ERROR_CODE = "error_code",
    ERROR_MESSAGE = "error_message",
    BYTE_SIZE = "byte_size",
    NUM_PAGES = "num_pages",
    SCREENSHOT_PIXELS = "screenshot_pixels",
    SCREENSHOT_LAYOUT = "screenshot_layout",
    CSV_ROWS = "csv_rows",
    CSV_COLUMNS = "csv_columns",
    ATTEMPT = "attempt"
}
export declare enum ScheduleType {
    SINGLE = "single",
    SCHEDULED = "scheduled"
}
export declare const REPORTING_TRANSACTION_TYPE = "reporting";
export declare const UNVERSIONED_VERSION = "7.14.0";
