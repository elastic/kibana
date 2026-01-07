/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConfigDeprecationProvider } from '@kbn/core/server';

export const autocompleteConfigDeprecationProvider: ConfigDeprecationProvider = ({
  renameFromRoot,
}) => [
  renameFromRoot(
    'data.autocomplete.valueSuggestions.terminateAfter',
    'kql.autocomplete.valueSuggestions.terminateAfter',
    { level: 'warning' }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.terminateAfter',
    'kql.autocomplete.valueSuggestions.terminateAfter',
    { level: 'warning' }
  ),
  renameFromRoot(
    'kibana.autocompleteTerminateAfter',
    'kql.autocomplete.valueSuggestions.terminateAfter',
    { level: 'warning' }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.terminateAfter',
    'kql.autocomplete.valueSuggestions.terminateAfter',
    { level: 'warning' }
  ),
  renameFromRoot(
    'data.autocomplete.valueSuggestions.timeout',
    'kql.autocomplete.valueSuggestions.timeout',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.timeout',
    'kql.autocomplete.valueSuggestions.timeout',
    {
      level: 'warning',
    }
  ),
  renameFromRoot('kibana.autocompleteTimeout', 'kql.autocomplete.valueSuggestions.timeout', {
    level: 'warning',
  }),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.timeout',
    'kql.autocomplete.valueSuggestions.timeout',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'data.autocomplete.querySuggestions.enabled',
    'kql.autocomplete.querySuggestions.enabled',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.querySuggestions.enabled',
    'kql.autocomplete.querySuggestions.enabled',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'data.autocomplete.valueSuggestions.enabled',
    'kql.autocomplete.valueSuggestions.enabled',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.enabled',
    'kql.autocomplete.valueSuggestions.enabled',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'data.autocomplete.valueSuggestions.tiers',
    'kql.autocomplete.valueSuggestions.tiers',
    {
      level: 'warning',
    }
  ),
  renameFromRoot(
    'unifiedSearch.autocomplete.valueSuggestions.tiers',
    'kql.autocomplete.valueSuggestions.tiers',
    {
      level: 'warning',
    }
  ),
];
