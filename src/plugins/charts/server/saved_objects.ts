/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'kibana/server';

export function setupSavedObjects(core: CoreSetup) {
  core.savedObjects.registerType({
    name: 'palette',
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      icon: 'brush',
      defaultSearchField: 'title',
      importableAndExportable: true,
      getTitle: (obj: { attributes: { title: string } }) => obj.attributes.title,
    },
    mappings: {
      properties: {
        title: {
          type: 'text',
        },
        name: {
          type: 'text',
        },
        params: {
          type: 'flattened',
        },
      },
    },
  });
}
