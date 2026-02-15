/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

/**
 * No-op i18n implementation for the standalone package.
 *
 * Consumer-facing labels (e.g. "Dashboards", "Settings") are provided through
 * navigation items and do not need translation here. Internal labels like
 * "More" and screen-reader instructions use `i18n.translate()` in the source
 * and will render their `defaultMessage` values through this stub.
 */

/** No-op `i18n.translate` that returns `defaultMessage`. */
export const translate = (
  _id: string,
  options?: { defaultMessage?: string; values?: Record<string, unknown> }
) => {
  return options?.defaultMessage ?? _id;
};

/** No-op `FormattedMessage` component that renders `defaultMessage`. */
export const FormattedMessage: React.FC<{
  id: string;
  defaultMessage?: string;
  values?: Record<string, unknown>;
}> = ({ id, defaultMessage, values }) => {
  if (values && defaultMessage) {
    return (
      <>
        {Object.entries(values).reduce(
          (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val)),
          defaultMessage
        )}
      </>
    );
  }
  return <>{defaultMessage ?? id}</>;
};

/** No-op `I18nProvider` that renders children unchanged. */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const i18n = { translate };
