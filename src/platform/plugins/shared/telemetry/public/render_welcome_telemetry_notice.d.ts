import React from 'react';
import type { TelemetryService } from './services';
import type { TelemetryConstants } from './plugin';
export declare function renderWelcomeTelemetryNotice(telemetryService: TelemetryService, addBasePath: (url: string) => string, telemetryConstants: TelemetryConstants): React.JSX.Element;
