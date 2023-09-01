/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum DynamicAutocompleteItem {
  SourceIdentifier = 'SourceIdentifier',
  FieldIdentifier = 'FieldIdentifier',
  PolicyIdentifier = 'PolicyIdentifier',
  PolicyFieldIdentifier = 'PolicyFieldIdentifier',
  PolicyMatchingFieldIdentifier = 'PolicyMatchingFieldIdentifier',
}

const DynamicAutocompleteItems = Object.values(DynamicAutocompleteItem);

export function isDynamicAutocompleteItem(v: unknown): v is DynamicAutocompleteItem {
  return DynamicAutocompleteItems.some((dai) => dai === v);
}
