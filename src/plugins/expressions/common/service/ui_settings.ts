/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IUiSettingsClient } from 'src/core/public';
import { createGetterSetter } from '../../../kibana_utils/common';

export const [getUiSettings, setUiSettings] = createGetterSetter<IUiSettingsClient>('UiSettings');
