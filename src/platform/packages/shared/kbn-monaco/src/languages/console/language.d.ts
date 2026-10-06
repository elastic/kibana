/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '../../monaco_imports';
import type { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import type { LangModuleType } from '../../types';
export declare const CONSOLE_TRIGGER_CHARS: string[];
/**
 * @description This language definition is used for the console input panel
 */
export declare const ConsoleLang: LangModuleType;
/**
 * @description This language definition is used for the console output panel
 */
export declare const ConsoleOutputLang: LangModuleType;
export declare const CONSOLE_THEME_ID: 'console';
export declare const CONSOLE_OUTPUT_THEME_ID: 'console';
export declare const getParsedRequestsProvider: (
  model: monaco.editor.ITextModel | null
) => ConsoleParsedRequestsProvider;
