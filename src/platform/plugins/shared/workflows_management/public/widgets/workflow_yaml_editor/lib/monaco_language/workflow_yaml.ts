/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { makeHighContrastColor } from '@elastic/eui';
import type { LangModuleType, monaco } from '@kbn/monaco';
import {
  YamlLang,
  registerLanguage,
  defaultThemesResolvers,
  CODE_EDITOR_DEFAULT_THEME_ID,
} from '@kbn/monaco';

export const WORKFLOW_YAML_LANG_ID = 'workflow-yaml';

/**
 * Build workflow-specific theme rules inline
 */
const buildWorkflowTheme = (
  useEuiThemeContext: UseEuiTheme
): monaco.editor.IStandaloneThemeData => {
  const baseTheme = defaultThemesResolvers[CODE_EDITOR_DEFAULT_THEME_ID](useEuiThemeContext);
  const { euiTheme } = useEuiThemeContext;
  const background = euiTheme.colors.backgroundBaseSubdued;

  // Simple helper to create token rules
  const rule = (token: string, color: string): monaco.editor.ITokenThemeRule => ({
    token,
    foreground: color,
  });

  return {
    ...baseTheme,
    rules: [
      ...baseTheme.rules,
      // Template variables
      rule('template-variable-valid', makeHighContrastColor(euiTheme.colors.primary)(background)),
      rule(
        'template-variable-error',
        makeHighContrastColor(euiTheme.colors.severity.danger)(background)
      ),
      rule(
        'template-variable-warning',
        makeHighContrastColor(euiTheme.colors.vis.euiColorVisWarning1)(background)
      ),
      // Connectors and triggers can be added here when needed
    ],
  };
};

/**
 * Workflow YAML language module that extends base YAML with workflow-specific theming
 */
export const WorkflowYamlLang: LangModuleType = {
  ID: WORKFLOW_YAML_LANG_ID,
  lexerRules: YamlLang.lexerRules,
  languageConfiguration: YamlLang.languageConfiguration,
  languageThemeResolver: buildWorkflowTheme,
};

/**
 * Register the workflow YAML language with Monaco
 */
export const registerWorkflowYamlLanguage = () => {
  registerLanguage(WorkflowYamlLang);
};
