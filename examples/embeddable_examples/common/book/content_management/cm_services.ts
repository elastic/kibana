/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableContentManagementDefinition } from '@kbn/embeddable-plugin/common';
import { bookAttributesDefinition as bookAttributesDefinitionV1 } from './schema/v1';
import { bookAttributesDefinition as bookAttributesDefinitionV2 } from './schema/v2';
import { bookAttributesDefinition as bookAttributesDefinitionV3 } from './schema/v3';

export const bookCmDefinitions: EmbeddableContentManagementDefinition = {
  id: 'book',
  versions: {
    1: bookAttributesDefinitionV1,
    2: bookAttributesDefinitionV2,
    3: bookAttributesDefinitionV3,
  },
  latestVersion: 1,
};
