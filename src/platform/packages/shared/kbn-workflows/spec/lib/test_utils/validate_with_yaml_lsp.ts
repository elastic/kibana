/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import yaml from 'yaml';
import { getLanguageService } from 'yaml-language-server';
import type { Diagnostic } from 'yaml-language-server';
import type { z } from '@kbn/zod/v4';
import { getPathAtOffset } from '../../../common/utils/yaml/get_path_at_offset';

interface FormattedDiagnostic {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  received: string;
  path: string;
}

export type ValidateWithYamlLspFunction = (
  fileName: string,
  yamlString: string
) => PromiseLike<FormattedDiagnostic[]>;

export function getValidateWithYamlLsp(
  jsonSchema: z.core.JSONSchema.JSONSchema
): ValidateWithYamlLspFunction {
  const schemaUri = 'dummy://schema.json';
  const yamlLanguageService = getLanguageService({
    schemaRequestService: (_uri: string) => {
      return Promise.resolve(JSON.stringify(jsonSchema));
    },
    workspaceContext: {
      resolveRelativePath: (_relativePath: string, _resource: string) => {
        return '';
      },
    },
  });
  yamlLanguageService.configure({
    schemas: [{ fileMatch: ['*.yaml'], uri: schemaUri }],
    validate: true,
  });

  return async (fileName: string, yamlString: string) => {
    const textDocument = TextDocument.create(fileName, 'yaml', 1, yamlString);
    const yamlDocument = yaml.parseDocument(yamlString);
    const diagnostics = await yamlLanguageService.doValidation(textDocument, false);
    // todo: format diagnostics
    return diagnostics.map((diagnostic) => {
      const path = getPathAtOffset(yamlDocument, textDocument.offsetAt(diagnostic.range.start));
      const receivedValue = yamlDocument.getIn(path, true) as yaml.Node | undefined;
      return {
        severity: getSeverityString(diagnostic.severity),
        message: diagnostic.message,
        // received: textDocument.getText(diagnostic.range),
        received: receivedValue ? receivedValue.toJSON() : '<missing>',
        path: path.join('.'),
      };
    });
  };
}

function getSeverityString(
  severity: Diagnostic['severity']
): 'error' | 'warning' | 'info' | 'hint' {
  switch (severity) {
    case 1:
      return 'error';
    case 2:
      return 'warning';
    case 3:
      return 'info';
    case 4:
      return 'hint';
    default:
      return 'info';
  }
}
