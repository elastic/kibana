export declare enum LogLevelCoalescedValue {
    trace = "trace",
    debug = "debug",
    info = "info",
    notice = "notice",
    warning = "warning",
    error = "error",
    critical = "critical",
    alert = "alert",
    emergency = "emergency",
    fatal = "fatal"
}
export declare const severityOrder: LogLevelCoalescedValue[];
export declare const logLevelSynonyms: Record<string, LogLevelCoalescedValue>;
export declare const getLogLevelCoalescedValue: (logLevel: string | string[] | unknown) => LogLevelCoalescedValue | undefined;
export declare const getLogLevelCoalescedValueLabel: (coalescedValue: LogLevelCoalescedValue) => string;
