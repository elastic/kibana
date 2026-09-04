/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { constructUrl } from '../../../../../lib/es';
import type { MetricsTracker } from '../../../../../types';
import type { DevToolsVariable } from '../../../../components';
import type { EditorRequest } from '../../types';
import { dataVariableTemplateRegex, urlVariableTemplateRegex } from '../constants';

/*
 * This function replaces any variables with its values stored in localStorage.
 * For example 'GET ${exampleVariable1} -> 'GET _search'.
 */
export const replaceRequestVariables = (
  { method, url, data }: EditorRequest,
  variables: DevToolsVariable[]
): EditorRequest => {
  return {
    method,
    url: replaceVariables(url, variables, false),
    data: data.map((dataObject) => replaceVariables(dataObject, variables, true)),
  };
};

/*
 * This function converts a request into a corresponding CURL command.
 */
export const getCurlRequest = (
  { method, url, data }: EditorRequest,
  elasticsearchBaseUrl: string
): string => {
  const curlUrl = constructUrl(elasticsearchBaseUrl, url);
  let curlRequest = `curl -X${method} "${curlUrl}" -H "kbn-xsrf: reporting"`;
  if (data && data.length) {
    const joinedData = data.join('\n');

    curlRequest += ` -H "Content-Type: application/json" -d'\n`;

    // We escape single quoted strings that are wrapped in single quoted strings
    curlRequest += joinedData.replace(/'/g, "'\\''");
    curlRequest += "'";
  }
  return curlRequest;
};

/*
 * This function uses the telemetry to track requests sent via Console.
 */
export const trackSentRequests = (
  requests: EditorRequest[],
  trackUiMetric: MetricsTracker
): void => {
  requests.map(({ method, url }) => {
    const eventName = `${method}_${url}`;
    trackUiMetric.count(eventName);
  });
};

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const replaceVariables = (
  text: string,
  variables: DevToolsVariable[],
  isDataVariable: boolean
): string => {
  if (!isDataVariable) {
    return text.replaceAll(new RegExp(urlVariableTemplateRegex.source, 'g'), (match, key) => {
      const variable = variables.find(({ name }) => name === key);
      return variable?.value ?? match;
    });
  }

  // Pass 1: replace "${var}" (whole string value) — preserves JSON type coercion so objects,
  // arrays, numbers, and booleans are inserted without surrounding quotes.
  text = text.replaceAll(new RegExp(dataVariableTemplateRegex.source, 'g'), (match, key) => {
    const variable = variables.find(({ name }) => name === key);
    if (!variable) return match;
    const { value } = variable;
    return isJsonString(value) ? value : `"${value}"`;
  });

  // Pass 2: replace any ${var} remaining inside strings (e.g. "frozen_${var}")
  text = text.replaceAll(new RegExp(urlVariableTemplateRegex.source, 'g'), (match, key) => {
    const variable = variables.find(({ name }) => name === key);
    return variable?.value ?? match;
  });

  return text;
};
