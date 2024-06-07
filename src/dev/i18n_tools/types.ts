/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ListrTaskWrapper, DefaultRenderer, SimpleRenderer } from 'listr2';
import { I18nConfig } from './i18n_config';
import { ErrorReporter } from './utils';

export interface I18nCheckTaskContext {
  config?: I18nConfig;
  reporter: ErrorReporter;
  messages: Map<string, { message: string }>;
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
