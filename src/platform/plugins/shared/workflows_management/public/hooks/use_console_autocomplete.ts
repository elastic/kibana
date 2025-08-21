/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';

export interface AutocompleteContext {
  currentPath: string;
  cursorPosition: number;
  currentValue: string;
  apiType?: 'elasticsearch.request' | 'kibana.request';
}

export interface AutocompleteSuggestion {
  text: string;
  description?: string;
  type: 'endpoint' | 'parameter' | 'value';
}

export const useConsoleAutocomplete = () => {
  const getSuggestions = useCallback(async (context: AutocompleteContext): Promise<string[]> => {
    const { currentValue, apiType } = context;
    
    // For now, return static suggestions based on API type
    // In a full implementation, this would integrate with the Console autocomplete service
    if (apiType === 'elasticsearch.request') {
      return getElasticsearchSuggestions(currentValue);
    } else if (apiType === 'kibana.request') {
      return getKibanaSuggestions(currentValue);
    }
    
    return [];
  }, []);

  const getElasticsearchSuggestions = (currentValue: string): string[] => {
    const suggestions = [
      '/_search',
      '/_cat/indices',
      '/_cluster/health',
      '/_nodes/stats',
      '/_aliases',
      '/_mapping',
      '/_settings',
      '/{index}/_doc',
      '/{index}/_search',
      '/{index}/_mapping',
      '/{index}/_settings',
      '/{index}/_update',
      '/{index}/_delete',
    ];

    if (!currentValue) return suggestions;
    
    return suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(currentValue.toLowerCase())
    );
  };

  const getKibanaSuggestions = (currentValue: string): string[] => {
    const suggestions = [
      'api/kibana/settings',
      'api/saved_objects',
      'api/spaces/space',
      'api/workflows',
      'api/index_patterns/index_pattern',
      'api/alerting/rule',
      'api/actions/connector',
      'api/triggers_actions_ui/connector_types',
      'api/triggers_actions_ui/connectors',
      'api/triggers_actions_ui/connectors/{id}',
      'api/triggers_actions_ui/connectors/{id}/execute',
      'api/triggers_actions_ui/connectors/{id}/test',
    ];

    if (!currentValue) return suggestions;
    
    return suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(currentValue.toLowerCase())
    );
  };

  return { getSuggestions };
};
