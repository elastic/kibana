/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { Document, Pair, Scalar } from 'yaml';
import { isPair, isScalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import {
  type ConnectorTypeInfo,
  getBuiltInStepStability,
  isBuiltInStepType,
  resolveKibanaStepTypeAlias,
} from '@kbn/workflows';
import { getBaseConnectorType } from '@kbn/workflows-ui';
import { getStepNodesWithType } from '../../../../../common/lib/yaml';
import { getCachedAllConnectorsMap } from '../../../../../common/schema';
import { stepSchemas } from '../../../../../common/step_schemas';
import { isConnectorActionUnavailable } from '../../../../shared/lib/action_type_utils';

const isTechPreviewStep = (connectorType: string): boolean => {
  const connector = getCachedAllConnectorsMap()?.get(connectorType);
  if (connector !== undefined && connector.stability === 'tech_preview') {
    return true;
  }
  return getBuiltInStepStability(connectorType) === 'tech_preview';
};

function buildConnectorDecoration(
  connectorType: string,
  baseConnectorType: string,
  lineNumber: number,
  startColumn: number,
  endColumn: number,
  isUnavailable: boolean
): monaco.editor.IModelDeltaDecoration {
  const techPreviewClass = isTechPreviewStep(connectorType) ? ' type-tech-preview' : '';
  const unavailableClass = isUnavailable ? ' type-unavailable' : '';

  return {
    range: { startLineNumber: lineNumber, startColumn, endLineNumber: lineNumber, endColumn },
    options: {
      inlineClassName: `type-inline-highlight type-${baseConnectorType.replaceAll(
        '.',
        '-'
      )}${techPreviewClass}${unavailableClass}`,
      stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
    },
  };
}

/**
 * Resolves the base connector type for decoration CSS class assignment.
 * Known step types (built-in or registered) keep their full type;
 * connector+action combos like "aws_lambda.invoke" are split to just the connector.
 */
export const resolveBaseConnectorType = (connectorType: string): string => {
  const isKnownStep =
    isBuiltInStepType(connectorType) || stepSchemas.getStepDefinition(connectorType) !== undefined;
  return isKnownStep ? connectorType : getBaseConnectorType(connectorType);
};

const extractScalarPair = (
  stepNode: { items: Array<Pair | unknown> },
  key: string
): Pair<Scalar, Scalar> | undefined =>
  stepNode.items.find(
    (item): item is Pair<Scalar, Scalar> =>
      isPair(item) && isScalar(item.key) && item.key.value === key && isScalar(item.value)
  ) as Pair<Scalar, Scalar> | undefined;

const resolveDecorationColumns = (
  connectorType: string,
  model: monaco.editor.ITextModel,
  startPosition: monaco.Position,
  endPosition: monaco.Position
): { targetLineNumber: number; startColumn: number; endColumn: number } => {
  let targetLineNumber = startPosition.lineNumber;
  let lineContent = model.getLineContent(targetLineNumber);
  let typeIndex = lineContent.indexOf(connectorType);

  if (typeIndex === -1 && endPosition.lineNumber !== startPosition.lineNumber) {
    targetLineNumber = endPosition.lineNumber;
    lineContent = model.getLineContent(targetLineNumber);
    typeIndex = lineContent.indexOf(connectorType);
  }

  if (typeIndex !== -1) {
    return {
      targetLineNumber,
      startColumn: typeIndex + 1,
      endColumn: typeIndex + connectorType.length + 1,
    };
  }

  return {
    targetLineNumber: startPosition.lineNumber,
    startColumn: startPosition.column,
    endColumn: endPosition.column,
  };
};

interface UseConnectorTypeDecorationsProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  yamlDocument: Document | null;
  isEditorMounted: boolean;
  connectorTypes?: Record<string, ConnectorTypeInfo>;
}

export const useConnectorTypeDecorations = ({
  editor,
  yamlDocument,
  isEditorMounted,
  connectorTypes,
}: UseConnectorTypeDecorationsProps) => {
  const connectorTypeDecorationCollectionRef =
    useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const typeExists = useCallback((type: string) => {
    const dynamicConnectorTypes = getCachedAllConnectorsMap() || new Map();
    return isBuiltInStepType(type) || dynamicConnectorTypes.has(type);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isEditorMounted || !editor || !yamlDocument) {
        return;
      }

      const model = editor.getModel();
      if (!model) {
        return;
      }

      if (connectorTypeDecorationCollectionRef.current) {
        connectorTypeDecorationCollectionRef.current.clear();
        connectorTypeDecorationCollectionRef.current = null;
      }

      const decorations: monaco.editor.IModelDeltaDecoration[] = [];
      const stepNodes = getStepNodesWithType(yamlDocument);

      for (const stepNode of stepNodes) {
        const typePair = extractScalarPair(stepNode, 'type');

        if (!typePair || !isScalar(typePair.value)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const connectorType = typePair.value.value;
        if (typeof connectorType !== 'string') {
          // eslint-disable-next-line no-continue
          continue;
        }

        if (connectorType.length < 3 && connectorType !== 'if') {
          // eslint-disable-next-line no-continue
          continue;
        }

        const typeRange = typePair.value.range;
        if (!typeRange || !Array.isArray(typeRange) || typeRange.length < 3) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const resolvedConnectorType = resolveKibanaStepTypeAlias(connectorType);

        if (!typeExists(resolvedConnectorType)) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const baseConnectorType = resolveBaseConnectorType(resolvedConnectorType);
        if (!baseConnectorType) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const startPosition = model.getPositionAt(typeRange[1]);
        const endPosition = model.getPositionAt(typeRange[2]);

        const trimmedLine = model.getLineContent(startPosition.lineNumber).trimStart();
        if (!trimmedLine.startsWith('type:')) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const { targetLineNumber, startColumn, endColumn } = resolveDecorationColumns(
          connectorType,
          model,
          startPosition,
          endPosition
        );
        const connectorIdPair = extractScalarPair(stepNode, 'connector-id');
        const connectorId = isScalar(connectorIdPair?.value)
          ? connectorIdPair.value.value
          : undefined;
        const isUnavailable =
          typeof connectorId === 'string' &&
          connectorTypes !== undefined &&
          isConnectorActionUnavailable(connectorId, resolvedConnectorType, connectorTypes);

        decorations.push(
          buildConnectorDecoration(
            resolvedConnectorType,
            baseConnectorType,
            targetLineNumber,
            startColumn,
            endColumn,
            isUnavailable
          )
        );
      }

      if (decorations.length > 0) {
        connectorTypeDecorationCollectionRef.current =
          editor.createDecorationsCollection(decorations);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isEditorMounted, yamlDocument, editor, typeExists, connectorTypes]);

  return {
    decorationCollectionRef: connectorTypeDecorationCollectionRef,
  };
};
