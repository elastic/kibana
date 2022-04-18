/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement } from 'react';
import { UiCounterMetricType } from '@kbn/analytics';
import { UiSettingsType } from '@kbn/core/public';

export interface FieldSetting {
  displayName: string;
  name: string;
  value: unknown;
  description?: string | ReactElement;
  options?: string[];
  optionLabels?: Record<string, string>;
  requiresPageReload: boolean;
  type: UiSettingsType;
  category: string[];
  ariaName: string;
  isOverridden: boolean;
  defVal: unknown;
  isCustom: boolean;
  readOnly?: boolean;
  order?: number;
  deprecation?: {
    message: string;
    docLinksKey: string;
  };
  metric?: {
    type: UiCounterMetricType;
    name: string;
  };
}

// until eui searchbar and query are typed

export interface SettingsChanges {
  [key: string]: any;
}

export interface FieldState {
  value?: any;
  changeImage?: boolean;
  loading?: boolean;
  isInvalid?: boolean;
  error?: string | null;
}
