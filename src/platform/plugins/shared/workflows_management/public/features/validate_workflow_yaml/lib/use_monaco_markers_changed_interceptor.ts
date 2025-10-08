/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { monaco } from '@kbn/monaco';
import { useCallback, useState } from 'react';
import type { z } from '@kbn/zod';
import type YAML from 'yaml';
import { formatMonacoYamlMarker } from '../../../widgets/workflow_yaml_editor/lib/format_monaco_yaml_marker';
import type { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { getSeverityString } from '../../../widgets/workflow_yaml_editor/lib/utils';
import type { YamlValidationResult } from '../model/types';

export interface UseMonacoMarkersChangedInterceptorResult {
  transformMonacoMarkers: (
    editorModel: monaco.editor.ITextModel,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => monaco.editor.IMarker[] | monaco.editor.IMarkerData[];
  handleMarkersChanged: (
    editorModel: monaco.editor.ITextModel,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
    owner: string
  ) => void;
  validationErrors: YamlValidationResult[];
}

interface UseMonacoMarkersChangedInterceptorProps {
  yamlDocumentRef: React.RefObject<YAML.Document | null>;
  workflowYamlSchema: z.ZodSchema;
  onValidationErrors?: React.Dispatch<React.SetStateAction<YamlValidationResult[]>>;
}

export function useMonacoMarkersChangedInterceptor({
  yamlDocumentRef,
  workflowYamlSchema,
  onValidationErrors,
}: UseMonacoMarkersChangedInterceptorProps): UseMonacoMarkersChangedInterceptorResult {
  const [validationErrors, setValidationErrors] = useState<YamlValidationResult[]>([]);

  const transformMonacoMarkers = useCallback(
    (
      editorModel: monaco.editor.ITextModel,
      markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
      owner: string
    ) => {
      return markers.map((marker) => {
        if (owner === 'yaml') {
          marker = formatMonacoYamlMarker(
            marker,
            editorModel,
            workflowYamlSchema,
            yamlDocumentRef.current
          );
        }
        return marker;
      });
    },
    [workflowYamlSchema, yamlDocumentRef]
  );

  const handleMarkersChanged = useCallback(
    (
      _editorModel: monaco.editor.ITextModel,
      markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[],
      owner: string
    ) => {
      const errors: YamlValidationResult[] = [];
      for (const marker of markers) {
        // if (
        //   !marker.source ||
        //   ![
        //     'step-name-validation',
        //     'variable-validation',
        //     'yaml',
        //     'connector-id-validation',
        //   ].includes(marker.source.toLowerCase())
        // ) {
        //   // Only add errors for the specified sources to show in the UI
        //   continue;
        // }

        const validatedSource = marker.source as YamlValidationResult['source'];

        errors.push({
          message: marker.message,
          severity: getSeverityString(marker.severity as MarkerSeverity),
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          id: `${marker.startLineNumber}-${marker.startColumn}-${marker.endLineNumber}-${marker.endColumn}`,
          source: validatedSource,
          hoverMessage: null,
        });
      }
      const errorsUpdater = (prevErrors: YamlValidationResult[] | null) => {
        const prevOtherOwners = prevErrors?.filter(
          (e) => e.source.toLowerCase() !== owner.toLowerCase()
        );
        return [...(prevOtherOwners ?? []), ...errors];
      };
      setValidationErrors(errorsUpdater);
      onValidationErrors?.(errorsUpdater);
    },
    // the yamlDocumentRef is not needed here because it's a ref object and not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onValidationErrors, workflowYamlSchema]
  );

  return {
    validationErrors,
    transformMonacoMarkers,
    handleMarkersChanged,
  };
}
