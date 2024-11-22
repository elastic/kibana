/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsType } from '@kbn/core-saved-objects-server';

export const createHiddenTypeVariants = (createOptions: {
  name: string;
  hide?: boolean;
  hideFromHttpApis?: boolean;
}): SavedObjectsType => {
  return {
    name: createOptions.name,
    hidden: createOptions.hide ?? false,
    hiddenFromHttpApis: createOptions.hideFromHttpApis ?? undefined,
    namespaceType: createOptions.name === 'index-pattern' ? 'multiple' : 'single',
    mappings: {
      properties: {},
    },
  };
};
