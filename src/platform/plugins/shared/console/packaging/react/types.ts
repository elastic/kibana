/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Standalone type definitions, here we avoid imports to avoid compiling dependencies

export interface HttpSetup {
  get: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  post: <T = any>(url: string, body?: any, options?: { query?: Record<string, any> }) => Promise<T>;
  delete: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  put: <T = any>(url: string, body?: any, options?: { query?: Record<string, any> }) => Promise<T>;
  patch: <T = any>(
    url: string,
    body?: any,
    options?: { query?: Record<string, any> }
  ) => Promise<T>;
  head: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  fetch: <T = any>(
    url: string,
    options?: { method?: string; body?: any; query?: Record<string, any> }
  ) => Promise<T>;
}

// Toast notification types
export interface ToastInput {
  title?: string;
  text?: string;
  iconType?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

export interface NotificationCallbacks {
  addSuccess?: (toastOrTitle: ToastInput | string) => void;
  addWarning?: (toastOrTitle: ToastInput | string) => void;
  addDanger?: (toastOrTitle: ToastInput | string) => void;
  addError?: (error: Error, options?: { title?: string }) => void;
  add?: (toast: ToastInput) => { id: string };
  remove?: (toastId: string) => void;
}

export interface OneConsoleProps {
  lang?: 'en' | 'fr-FR' | 'ja-JP' | 'zh-CN';
  http?: Partial<HttpSetup>;
  notifications: NotificationCallbacks;
}
