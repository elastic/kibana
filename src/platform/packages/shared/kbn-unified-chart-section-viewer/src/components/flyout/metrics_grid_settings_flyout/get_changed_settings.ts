/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsGridSettings } from '../../../types';

export const getChangedSettings = (
  draft: MetricsGridSettings,
  applied: MetricsGridSettings
): Partial<MetricsGridSettings> =>
  Object.fromEntries(
    (Object.keys(draft) as Array<keyof MetricsGridSettings>)
      .filter((key) => draft[key] !== applied[key])
      .map((key) => [key, draft[key]])
  );
