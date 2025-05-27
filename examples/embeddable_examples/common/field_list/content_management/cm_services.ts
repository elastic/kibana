/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableContentManagementDefinition } from '@kbn/embeddable-plugin/common';
import { fieldListAttributesDefinition as fieldListAttributesDefinitionV1 } from './schema/v1';
import { fieldListAttributesDefinition as fieldListAttributesDefinitionV2 } from './schema/v2';
import { FIELD_LIST_ID } from '../constants';

/**
 * In version 1 of the field list, the client-side embeddable was expected to inject and extract references.
 * So the `itemToSavedObject` and `savedObjectToItem` methods were identity functions.
 * In version 2 of the field list, the server handles data views references.
 * So the `itemToSavedObject` and `savedObjectToItem` methods perform reference extraction and injection
 * and the embeddable client does not need to know about references.
 */
export const fieldListCmDefinitions: EmbeddableContentManagementDefinition = {
  id: FIELD_LIST_ID,
  versions: {
    1: fieldListAttributesDefinitionV1,
    2: fieldListAttributesDefinitionV2,
  },
  latestVersion: 2,
};
