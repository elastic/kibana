/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultAlertFormatterFormatters } from '../formatters';
import type { AlertFormatter } from '../types/alert_formatter_types';

export interface GetAlertViewInAppUrlParams {
  /** Alert fields passed to the formatter. */
  alert: Record<string, unknown>;
  formatter: AlertFormatter;
  prepend: (path: string) => string;
  /**
   * Reduces array values to their first element before formatting. Defaults to `true`, which
   * suits alerts read through the fields API; `false` passes the fields unchanged.
   */
  unwrapArrayValues?: boolean;
}

const getFirstValues = (alert: Record<string, unknown>): Record<string, unknown> => {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(alert)) {
    fields[key] = Array.isArray(value) ? value[0] : value;
  }
  return fields;
};

/**
 * Computes a "View in app" deep-link URL for an alert by calling its rule type's formatter.
 * Returns the final href (with base path prepended when needed), or null if no link can be resolved.
 */
export const getAlertViewInAppUrl = ({
  alert,
  formatter,
  prepend,
  unwrapArrayValues = true,
}: GetAlertViewInAppUrlParams): string | null => {
  try {
    const fields = unwrapArrayValues ? getFirstValues(alert) : alert;

    const formattedAlert = formatter({
      fields,
      formatters: defaultAlertFormatterFormatters,
    });

    if (!formattedAlert?.link) {
      return null;
    }

    return formattedAlert.hasBasePath ? formattedAlert.link : prepend(formattedAlert.link);
  } catch {
    return null;
  }
};
