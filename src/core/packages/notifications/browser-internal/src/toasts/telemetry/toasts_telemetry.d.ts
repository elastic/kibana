import type { ComponentProps } from 'react';
import type { EuiToast } from '@elastic/eui';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
type ToastMessageType = Exclude<ComponentProps<typeof EuiToast>['color'], 'success'>;
export declare class ToastsTelemetry {
    private reportEvent?;
    setup({ analytics }: {
        analytics: AnalyticsServiceSetup;
    }): {};
    start({ analytics }: {
        analytics: AnalyticsServiceStart;
    }): {
        onDismissToast: ({ recurrenceCount, toastMessage, toastMessageType, }: {
            toastMessage: string;
            recurrenceCount: number;
            toastMessageType: ToastMessageType;
        }) => void;
    };
    private onDismissToast;
}
export {};
