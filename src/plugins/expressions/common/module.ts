/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { interfaces } from 'inversify';
import type { Logger } from '@kbn/logging';
import type {
  IUiSettingsClient as UiSettingsClientPublic,
  SavedObjectsClientContract as SavedObjectsClientPublic,
} from '@kbn/core/public';
import type {
  IUiSettingsClient as UiSettingsClientServer,
  SavedObjectsClientContract as SavedObjectsClientServer,
  KibanaRequest,
} from '@kbn/core/server';

export const LoggerToken: interfaces.ServiceIdentifier<Logger> = Symbol.for('Logger');
export const KibanaRequestToken: interfaces.ServiceIdentifier<KibanaRequest> =
  Symbol.for('KibanaRequest');
export const SavedObjectsClientToken: interfaces.ServiceIdentifier<
  SavedObjectsClientPublic | SavedObjectsClientServer
> = Symbol.for('SavedObjectsClient');
export const UiSettingsClientToken: interfaces.ServiceIdentifier<
  UiSettingsClientPublic | UiSettingsClientServer
> = Symbol.for('UiSettingsClient');
