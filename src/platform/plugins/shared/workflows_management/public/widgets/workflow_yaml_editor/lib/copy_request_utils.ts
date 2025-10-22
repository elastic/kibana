/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchStepData } from './elasticsearch_step_utils';
import { stepToConsoleRequest } from './elasticsearch_step_utils';

export interface CopyAsOptions {
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
}

/**
 * Language options for "Copy as" functionality
 */
export const COPY_AS_LANGUAGES = [
  { value: 'curl', label: 'cURL' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go' },
] as const;

export type CopyAsLanguage = (typeof COPY_AS_LANGUAGES)[number]['value'];

/**
 * Converts an Elasticsearch workflow step to cURL command
 */
export function getCurlCommand(
  step: ElasticsearchStepData,
  elasticsearchBaseUrl: string = 'http://localhost:9200'
): string {
  const request = stepToConsoleRequest(step);

  const curlUrl = `${elasticsearchBaseUrl}${request.url}`;
  let curlCommand = `curl -X${request.method} "${curlUrl}"`;

  if (request.data && request.data.length > 0) {
    const joinedData = request.data.join('\n');
    curlCommand += ` -H "Content-Type: application/json" -d'${joinedData}'`;
  }

  return curlCommand;
}

/**
 * Converts an Elasticsearch workflow step to Console format
 */
export function getConsoleFormat(step: ElasticsearchStepData): string {
  const request = stepToConsoleRequest(step);

  let consoleFormat = `${request.method} ${request.url}`;

  if (request.data && request.data.length > 0) {
    consoleFormat += `\n${request.data.join('\n')}`;
  }

  return consoleFormat;
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'absolute';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    // console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Converts a workflow step to the specified language format using the Console API
 */
export async function convertStepToLanguage(
  step: ElasticsearchStepData,
  language: CopyAsLanguage,
  options: CopyAsOptions
): Promise<{ data?: string; error?: string }> {
  const { http, esHost = 'http://localhost:9200', kibanaHost = window.location.origin } = options;

  const request = stepToConsoleRequest(step);

  try {
    const response = await http.post<string>('/api/console/convert_request_to_language', {
      query: {
        language,
        esHost,
        kibanaHost,
      },
      body: JSON.stringify([request]),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return { data: response };
  } catch (error) {
    return {
      error: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.conversionError', {
        defaultMessage: 'Failed to convert request to {language}',
        values: { language },
      }),
    };
  }
}

/**
 * Copies a workflow step as the specified language format
 */
export async function copyStepAs(
  step: ElasticsearchStepData,
  language: CopyAsLanguage,
  options: CopyAsOptions
): Promise<void> {
  const { notifications } = options;

  let textToCopy: string;
  let success = false;

  try {
    if (language === 'curl') {
      // For cURL, use our local implementation for better performance
      textToCopy = getCurlCommand(step, options.esHost);
      success = await copyToClipboard(textToCopy);
    } else {
      // For other languages, use the Console API
      const { data, error } = await convertStepToLanguage(step, language, options);

      if (error) {
        notifications.toasts.addDanger({
          title: error,
        });
        return;
      }

      if (data) {
        textToCopy = data;
        success = await copyToClipboard(textToCopy);
      }
    }

    if (success) {
      const languageLabel = COPY_AS_LANGUAGES.find((l) => l.value === language)?.label || language;
      notifications.toasts.addSuccess({
        title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.success', {
          defaultMessage: 'Copied as {language}',
          values: { language: languageLabel },
        }),
      });
    } else {
      notifications.toasts.addDanger({
        title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.clipboardError', {
          defaultMessage: 'Failed to copy to clipboard',
        }),
      });
    }
  } catch (error) {
    notifications.toasts.addDanger({
      title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.unexpectedError', {
        defaultMessage: 'An unexpected error occurred',
      }),
    });
  }
}

/**
 * Copies a workflow step in Console format
 */
export async function copyAsConsole(
  step: ElasticsearchStepData,
  options: Pick<CopyAsOptions, 'notifications'>
): Promise<void> {
  const { notifications } = options;

  try {
    const consoleFormat = getConsoleFormat(step);
    const success = await copyToClipboard(consoleFormat);

    if (success) {
      notifications.toasts.addSuccess({
        title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.consoleSuccess', {
          defaultMessage: 'Copied as Console format',
        }),
      });
    } else {
      notifications.toasts.addDanger({
        title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.clipboardError', {
          defaultMessage: 'Failed to copy to clipboard',
        }),
      });
    }
  } catch (error) {
    notifications.toasts.addDanger({
      title: i18n.translate('workflows.workflowDetail.yamlEditor.copyAs.unexpectedError', {
        defaultMessage: 'An unexpected error occurred',
      }),
    });
  }
}
