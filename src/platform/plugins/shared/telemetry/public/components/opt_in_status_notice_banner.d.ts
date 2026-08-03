import * as React from 'react';
import type { HttpSetup } from '@kbn/core/public';
import type { TelemetryService } from '../services';
import type { TelemetryConstants } from '..';
interface Props {
    http: HttpSetup;
    onSeenBanner: () => unknown;
    telemetryConstants: TelemetryConstants;
    telemetryService: TelemetryService;
}
export declare const OptInStatusNoticeBanner: React.FC<Props>;
export {};
