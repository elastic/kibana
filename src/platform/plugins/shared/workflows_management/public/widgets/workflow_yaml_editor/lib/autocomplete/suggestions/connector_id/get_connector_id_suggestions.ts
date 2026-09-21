/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { ALL_CONNECTOR_IDS } from '@kbn/workflows';
import { getConnectorIdSuggestionsItems } from './get_connector_id_suggestions_items';
import {
  resolveConnectorIdStepType,
  resolveConnectorIdTriggerType,
} from './resolve_connector_id_step_type';
import {
  getCustomStepConnectorIdSelectionHandler,
  getInferenceConnectorInstances,
} from '../../../../../../shared/lib/connectors_utils';
import type { AutocompleteContext } from '../../context/autocomplete.types';

export async function getConnectorIdSuggestions({
  line,
  lineParseResult,
  range,
  focusedStepInfo,
  focusedYamlPair,
  path,
  yamlDocument,
  dynamicConnectorTypes,
}: AutocompleteContext) {
  const triggerConnectorType = resolveConnectorIdTriggerType(path, yamlDocument);
  const stepConnectorType =
    resolveConnectorIdStepType(focusedStepInfo, path, focusedYamlPair) ?? triggerConnectorType;

  if (!stepConnectorType || !lineParseResult || lineParseResult.matchType !== 'connector-id') {
    return [];
  }
  const connectorSelection = getCustomStepConnectorIdSelectionHandler(stepConnectorType);
  const customConnectorInstances = await getInferenceConnectorInstances(connectorSelection);
  if (!dynamicConnectorTypes && !customConnectorInstances) {
    return [];
  }
  // If the user has typed part of the connector-id, replace from the value start to the line end.
  const replacementRange =
    lineParseResult.fullKey !== ''
      ? {
          ...range,
          startColumn: lineParseResult.valueStartIndex + 1,
          endColumn: line.length + 1,
        }
      : range;
  const suggestions = getConnectorIdSuggestionsItems(
    stepConnectorType,
    replacementRange,
    dynamicConnectorTypes ?? undefined,
    customConnectorInstances
  );

  if (!triggerConnectorType) {
    return suggestions;
  }

  return [
    {
      label: i18n.translate('workflows.editor.autocomplete.allConnectorInstancesLabel', {
        defaultMessage: 'All connectors of this type',
      }),
      kind: monaco.languages.CompletionItemKind.Value,
      insertText: JSON.stringify(ALL_CONNECTOR_IDS),
      range: replacementRange,
      detail: triggerConnectorType,
      documentation: i18n.translate(
        'workflows.editor.autocomplete.allConnectorInstancesDocumentation',
        {
          defaultMessage:
            'Starts the workflow for events from every connector instance of this type.',
        }
      ),
      sortText: '0_all_connectors',
    },
    ...suggestions,
  ];
}
