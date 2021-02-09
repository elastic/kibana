/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '../../../core/public';
import { createGetterSetter } from '../../../plugins/kibana_utils/public';
import { VisEditorsRegistry } from './vis_editors_registry';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [
  getVisEditorsRegistry,
  setVisEditorsRegistry,
] = createGetterSetter<VisEditorsRegistry>('VisEditorsRegistry');
