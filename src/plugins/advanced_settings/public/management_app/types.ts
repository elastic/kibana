/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { UiCounterMetricType } from '@kbn/analytics';
import { UiSettingsType, StringValidation, ImageValidation } from '../../../../core/public';

export interface FieldSetting {
  displayName: string;
  name: string;
  value: unknown;
  description?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  requiresPageReload: boolean;
  type: UiSettingsType;
  category: string[];
  ariaName: string;
  isOverridden: boolean;
  defVal: unknown;
  isCustom: boolean;
  validation?: StringValidation | ImageValidation;
  readOnly?: boolean;
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
