import React from 'react';
export interface ChartSectionSearchErrorProps {
    error: unknown;
    title: string;
}
/**
 * Chart-section fetch failures (METRICS_INFO, Traces, etc.) using Discover's ErrorCallout.
 * Host injects notifications and doc links via `ExternalServicesProvider`.
 */
export declare const ChartSectionSearchError: ({ error, title }: ChartSectionSearchErrorProps) => React.JSX.Element;
