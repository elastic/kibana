/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../monaco_imports';
import { buildConsoleBasicTheme } from './basic_theme';
import { buildConsoleSharedJsonRules } from './shared_json_rules';

const basicTheme = buildConsoleBasicTheme();

export const buildConsoleOutputJsonTheme = (): monaco.editor.IStandaloneThemeData => {
  const sharedJsonRules = buildConsoleSharedJsonRules();
  return {
    ...basicTheme,
    rules: sharedJsonRules,
  };
};

export const buildConsoleOutputYamlTheme = (): monaco.editor.IStandaloneThemeData => {
  return {
    ...basicTheme,
  };
};

export const buildConsoleOutputTextTheme = (): monaco.editor.IStandaloneThemeData => {
  return {
    ...basicTheme,
  };
};
