/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
