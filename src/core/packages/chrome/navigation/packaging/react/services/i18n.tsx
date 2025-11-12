/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

// No-op i18n implementation
// Returns the defaultMessage from i18n.translate() calls
// Consumers provide their own labels via navigation items, so translations aren't needed

/**
 * No-op i18n.translate function that returns default messages
 */
export const translate = (id: string, options?: { defaultMessage?: string; values?: any }) => {
  return options?.defaultMessage || id;
};

/**
 * No-op FormattedMessage component that renders default message
 */
export const FormattedMessage: React.FC<{
  id: string;
  defaultMessage?: string;
  values?: Record<string, any>;
}> = ({ id, defaultMessage }) => {
  return <>{defaultMessage || id}</>;
};

/**
 * No-op I18nProvider that simply renders children
 */
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

/**
 * No-op i18n object for compatibility with @kbn/i18n
 */
export const i18n = {
  translate,
};

/**
 * Initialize the no-op i18n system
 * This is called by the OneNavigation wrapper
 */
export const initializeI18n = () => {
  // No initialization needed for no-op implementation
  // The webpack aliases will redirect imports to this file
};
