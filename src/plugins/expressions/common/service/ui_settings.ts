/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { KibanaRequest } from 'src/core/server';

import { createGetterSetter } from '../../../kibana_utils/common';

interface UiSettingsClientFactoryParameters {
  getKibanaRequest(): KibanaRequest;
}

interface UiSettingsClient {
  get<T>(key: string, defaultValue?: T): T | Promise<T>;
}

type UiSettingsClientFactory = (parameters: UiSettingsClientFactoryParameters) => UiSettingsClient;

export const [
  getUiSettingsFactory,
  setUiSettingsFactory,
] = createGetterSetter<UiSettingsClientFactory>('UiSettingsFactory');
