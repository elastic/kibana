/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTaskWrapper, DefaultRenderer, SimpleRenderer } from 'listr2';
import type { TaskReporter } from './utils/task_reporter';

export interface MessageDescriptor {
  id: string;
  description?: string | object;
  defaultMessage?: string;
  file?: string;
  start?: number;
  end?: number;
  hasValuesObject?: boolean;
  valuesKeys?: string[];
  ignoreTag?: boolean;
}

export interface I18nCheckTaskContext {
  config?: I18nConfig;
  messages: Map<string, MessageDescriptor[]>;
  taskReporter: TaskReporter;
}

export interface I18nConfig {
  paths: Record<string, string[]>;
  exclude: string[];
  translations: string[];
  prefix?: string;
}

export type I18nTask = ListrTaskWrapper<
  I18nCheckTaskContext,
  typeof DefaultRenderer,
  typeof SimpleRenderer
>;

export type TaskSignature<TaskOptions> = (
  context: I18nCheckTaskContext,
  task: I18nTask,
  options: TaskOptions
) => void;
