/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectorConfigProperties, ConnectorConfigCategoryProperties } from '../types/connectors';

export function isCategoryEntry(
  input:
    | ConnectorConfigProperties
    | ConnectorConfigCategoryProperties
    | { label: string; value: boolean }
    | null
): input is ConnectorConfigCategoryProperties {
  return (input as ConnectorConfigCategoryProperties)?.type === 'category';
}

export function isConfigEntry(
  input:
    | ConnectorConfigProperties
    | ConnectorConfigCategoryProperties
    | { label: string; value: boolean }
    | null
): input is ConnectorConfigProperties {
  return (input as ConnectorConfigCategoryProperties).type !== 'category';
}
