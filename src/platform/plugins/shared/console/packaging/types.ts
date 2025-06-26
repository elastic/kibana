/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Standalone type definitions - no imports to avoid compiling dependencies

export interface HttpSetup {
  get: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  post: <T = any>(url: string, body?: any, options?: { query?: Record<string, any> }) => Promise<T>;
  delete: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  put: <T = any>(url: string, body?: any, options?: { query?: Record<string, any> }) => Promise<T>;
  patch: <T = any>(url: string, body?: any, options?: { query?: Record<string, any> }) => Promise<T>;
  head: <T = any>(url: string, options?: { query?: Record<string, any> }) => Promise<T>;
  fetch: <T = any>(url: string, options?: { method?: string; body?: any; query?: Record<string, any> }) => Promise<T>;
}

export interface OneConsoleProps {
  lang?: 'en' | 'fr-FR' | 'ja-JP' | 'zh-CN';
  http?: Partial<HttpSetup>;
}
