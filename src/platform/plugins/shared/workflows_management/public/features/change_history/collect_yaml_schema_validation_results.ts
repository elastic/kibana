/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import { parseDocument } from 'yaml';
import { monaco } from '@kbn/code-editor';
import type { z } from '@kbn/zod/v4';
import {
  getSeverityString,
  type MarkerSeverity,
} from '../../widgets/workflow_yaml_editor/lib/utils';
import { filterMonacoYamlMarkers } from '../validate_workflow_yaml/lib/filter_monaco_yaml_markers';
import { formatMonacoYamlMarker } from '../validate_workflow_yaml/lib/format_monaco_yaml_marker';
import type { YamlValidationResult } from '../validate_workflow_yaml/model/types';

export const collectYamlSchemaValidationResults = (
  model: monaco.editor.ITextModel,
  yamlDocument: YAML.Document | null,
  workflowZodSchema: z.ZodSchema
): YamlValidationResult[] => {
  const yamlDocumentForFormatting = yamlDocument ?? parseDocument(model.getValue());
  const modelUri = model.uri.toString();
  let markers = monaco.editor.getModelMarkers({ resource: model.uri, owner: 'yaml' });

  if (markers.length === 0) {
    markers = monaco.editor
      .getModelMarkers({ owner: 'yaml' })
      .filter((marker) => marker.resource.toString() === modelUri);
  }

  const filtered = filterMonacoYamlMarkers(markers, model, yamlDocumentForFormatting);

  return filtered.map((marker) => {
    const formatted = formatMonacoYamlMarker(
      marker,
      model,
      workflowZodSchema,
      yamlDocumentForFormatting
    );

    return {
      id: `yaml-${formatted.startLineNumber}-${formatted.startColumn}-${formatted.endLineNumber}-${formatted.endColumn}`,
      message: formatted.message,
      severity: getSeverityString(formatted.severity as MarkerSeverity),
      startLineNumber: formatted.startLineNumber,
      startColumn: formatted.startColumn,
      endLineNumber: formatted.endLineNumber,
      endColumn: formatted.endColumn,
      owner: 'yaml',
      source: formatted.source,
      hoverMessage: null,
      afterMessage: null,
    };
  });
};

export const mergeWorkflowYamlValidationResults = (
  customResults: YamlValidationResult[],
  yamlSchemaResults: YamlValidationResult[]
): YamlValidationResult[] => [
  ...customResults.filter((result) => result.owner !== 'yaml'),
  ...yamlSchemaResults,
];
