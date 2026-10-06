import { type FunctionComponent } from 'react';
import type { Observable } from 'rxjs';
import type { Toast } from '@kbn/core-notifications-browser';
import type { ToastsTelemetry } from './telemetry';
interface Props {
    toasts$: Observable<Toast[]>;
    reportEvent: ReturnType<ToastsTelemetry['start']>;
    dismissToast: (toastId: string) => void;
}
export declare const GlobalToastList: FunctionComponent<Props>;
export {};
