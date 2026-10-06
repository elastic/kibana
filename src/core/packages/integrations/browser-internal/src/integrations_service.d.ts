/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export interface IntegrationsServiceSetupDeps {
  uiSettings: IUiSettingsClient;
}
/** @internal */
export declare class IntegrationsService implements CoreService {
  private readonly styles;
  private readonly moment;
  setup(): Promise<void>;
  start({ uiSettings }: IntegrationsServiceSetupDeps): Promise<void>;
  stop(): Promise<void>;
}
