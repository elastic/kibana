/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import type YAML from 'yaml';
import { i18n } from '@kbn/i18n';
import { findElasticsearchStepAtPosition } from './elasticsearch_step_utils';
import { copyStepAs, copyAsConsole, type CopyAsOptions } from './copy_request_utils';

export interface ElasticsearchStepContextMenuProviderOptions {
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  getYamlDocument: () => YAML.Document | null;
}

/**
 * Enhances Monaco editor with Elasticsearch step context menu functionality
 * This is a simplified implementation that adds keyboard shortcuts
 */
export function enhanceEditorWithElasticsearchStepContextMenu(
  editor: monaco.editor.IStandaloneCodeEditor,
  options: ElasticsearchStepContextMenuProviderOptions
): monaco.IDisposable {
  const { getYamlDocument, http, notifications, esHost, kibanaHost } = options;
  
  // Add keyboard shortcuts for copy actions
  const copyAsConsoleAction = editor.addAction({
    id: 'elasticsearch.copyAsConsole',
    label: i18n.translate('workflows.workflowDetail.yamlEditor.action.copyAsConsole', {
      defaultMessage: 'Copy Elasticsearch step as Console format',
    }),
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyC],
    run: async () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      
      if (!model || !position) {
        return;
      }
      
      const yamlDocument = getYamlDocument();
      if (!yamlDocument) {
        return;
      }

      const elasticsearchStep = findElasticsearchStepAtPosition(model, position, yamlDocument);
      if (!elasticsearchStep) {
        return;
      }

      const copyAsOptions: CopyAsOptions = {
        http,
        notifications,
        esHost,
        kibanaHost,
      };

      await copyAsConsole(elasticsearchStep, copyAsOptions);
    },
  });

  const copyAsCurlAction = editor.addAction({
    id: 'elasticsearch.copyAsCurl',
    label: i18n.translate('workflows.workflowDetail.yamlEditor.action.copyAsCurl', {
      defaultMessage: 'Copy Elasticsearch step as cURL',
    }),
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyCode.KeyU],
    run: async () => {
      const model = editor.getModel();
      const position = editor.getPosition();
      
      if (!model || !position) {
        return;
      }
      
      const yamlDocument = getYamlDocument();
      if (!yamlDocument) {
        return;
      }

      const elasticsearchStep = findElasticsearchStepAtPosition(model, position, yamlDocument);
      if (!elasticsearchStep) {
        return;
      }

      const copyAsOptions: CopyAsOptions = {
        http,
        notifications,
        esHost,
        kibanaHost,
      };

      await copyStepAs(elasticsearchStep, 'curl', copyAsOptions);
    },
  });

  // Return a disposable that cleans up the actions
  return {
    dispose: () => {
      copyAsConsoleAction.dispose();
      copyAsCurlAction.dispose();
    },
  };
}
