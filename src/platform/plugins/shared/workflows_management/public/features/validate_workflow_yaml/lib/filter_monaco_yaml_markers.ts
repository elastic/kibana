/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import { isScalar } from 'yaml';
import type { monaco } from '@kbn/monaco';
import { isDynamicValue, isVariableValue } from '../../../../common/lib/regex';
import { getScalarValueAtOffset } from '../../../../common/lib/yaml/get_node_value';

export function filterMonacoYamlMarkers(
  markers: monaco.editor.IMarkerData[],
  editorModel: monaco.editor.ITextModel,
  yamlDocument: YAML.Document | null
): monaco.editor.IMarkerData[] {
  return markers.filter((marker) => {
    // Check if this marker is for a dynamic value - if so, suppress the validation error
    if (yamlDocument) {
      try {
        // TODO: remove this getOffsetAt call once we ensure yamlDocument always has a lineCounter
        const markerOffset = editorModel.getOffsetAt({
          lineNumber: marker.startLineNumber,
          column: marker.startColumn,
        });

        const scalarNode = getScalarValueAtOffset(yamlDocument, markerOffset);
        if (
          scalarNode &&
          isScalar(scalarNode) &&
          (isDynamicValue(scalarNode.value) || isVariableValue(scalarNode.value))
        ) {
          // Return false to suppress this marker - it will be filtered out in transformMonacoMarkers
          return false;
        }
      } catch (error) {
        // If we can't determine the value, continue with normal processing
        // Fall through to existing logic
      }
    }
    return true;
  });
}
