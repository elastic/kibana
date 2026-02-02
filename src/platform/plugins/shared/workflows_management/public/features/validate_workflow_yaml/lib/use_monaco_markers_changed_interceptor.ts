/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useState } from 'react';
import type YAML from 'yaml';
import type { monaco } from '@kbn/monaco';
import type { z } from '@kbn/zod/v4';
import { filterMonacoYamlMarkers } from './filter_monaco_yaml_markers';
import { formatMonacoYamlMarker } from './format_monaco_yaml_marker';
import type { MarkerSeverity } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { getSeverityString } from '../../../widgets/workflow_yaml_editor/lib/utils';
import { isYamlValidationMarkerOwner, type YamlValidationResult } from '../model/types';

export interface UseMonacoMarkersChangedInterceptorResult {
  transformMonacoMarkers: (
    editorModel: monaco.editor.ITextModel,
    owner: string,
    markers: monaco.editor.IMarkerData[]
  ) => monaco.editor.IMarker[] | monaco.editor.IMarkerData[];
  handleMarkersChanged: (
    editorModel: monaco.editor.ITextModel,
    owner: string,
    markers: monaco.editor.IMarker[] | monaco.editor.IMarkerData[]
  ) => void;
  validationErrors: YamlValidationResult[];
}

interface UseMonacoMarkersChangedInterceptorProps {
  yamlDocumentRef: React.RefObject<YAML.Document | null>;
  workflowYamlSchema: z.ZodSchema;
}

export function useMonacoMarkersChangedInterceptor({
  yamlDocumentRef,
  workflowYamlSchema,
}: UseMonacoMarkersChangedInterceptorProps): UseMonacoMarkersChangedInterceptorResult {
  const [validationErrors, setValidationErrors] = useState<YamlValidationResult[]>([]);

  const transformMonacoMarkers = useCallback(
    (
      editorModel: monaco.editor.ITextModel,
      owner: string,
      markers: monaco.editor.IMarkerData[]
    ) => {
      return filterMonacoYamlMarkers(markers, editorModel, yamlDocumentRef.current).map(
        (marker) => {
          if (owner === 'yaml') {
            return formatMonacoYamlMarker(
              marker,
              editorModel,
              workflowYamlSchema,
              yamlDocumentRef.current
            );
          }
          return marker;
        }
      );
    },
    [workflowYamlSchema, yamlDocumentRef]
  );

  const handleMarkersChanged = useCallback(
    (
      _editorModel: monaco.editor.ITextModel,
      owner: string,
      markers: monaco.editor.IMarkerData[]
    ) => {
      const errors: YamlValidationResult[] = [];
      for (const marker of markers) {
        if (!isYamlValidationMarkerOwner(owner)) {
          // console.log('skipping marker for unknown owner', owner);
          // eslint-disable-next-line no-continue
          continue;
        }

        errors.push({
          message: marker.message,
          severity: getSeverityString(marker.severity as MarkerSeverity),
          startLineNumber: marker.startLineNumber,
          startColumn: marker.startColumn,
          endLineNumber: marker.endLineNumber,
          endColumn: marker.endColumn,
          id: `${marker.startLineNumber}-${marker.startColumn}-${marker.endLineNumber}-${marker.endColumn}`,
          owner,
          source: marker.source,
          hoverMessage: null,
        });
      }
      const errorsUpdater = (prevErrors: YamlValidationResult[] | null) => {
        const prevOtherOwners = prevErrors?.filter((e) => e.owner !== owner);
        return [...(prevOtherOwners ?? []), ...errors];
      };
      setValidationErrors(errorsUpdater);
    },
    // the yamlDocumentRef is not needed here because it's a ref object and not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflowYamlSchema]
  );

  return {
    validationErrors,
    transformMonacoMarkers,
    handleMarkersChanged,
  };
}
