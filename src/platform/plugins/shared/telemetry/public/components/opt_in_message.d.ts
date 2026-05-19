import * as React from 'react';
import type { IBasePath } from '@kbn/core-http-browser';
import type { TelemetryService } from '../services';
import type { TelemetryConstants } from '..';
export interface OptInMessageProps {
    telemetryConstants: TelemetryConstants;
    telemetryService: TelemetryService;
    addBasePath: IBasePath['prepend'];
    onClick?: () => unknown;
}
export declare const OptInMessage: React.FC<OptInMessageProps>;
