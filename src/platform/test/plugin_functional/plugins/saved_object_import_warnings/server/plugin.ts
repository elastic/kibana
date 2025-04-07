/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin, CoreSetup } from '@kbn/core/server';

export class SavedObjectImportWarningsPlugin implements Plugin {
  public setup({ savedObjects }: CoreSetup, deps: {}) {
    savedObjects.registerType<{ title: string }>({
      name: 'test_import_warning_1',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onImport: (objects) => {
          return {
            warnings: [{ type: 'simple', message: 'warning for test_import_warning_1' }],
          };
        },
      },
    });

    savedObjects.registerType<{ title: string }>({
      name: 'test_import_warning_2',
      hidden: false,
      namespaceType: 'single',
      mappings: {
        properties: {
          title: { type: 'text' },
        },
      },
      management: {
        defaultSearchField: 'title',
        importableAndExportable: true,
        getTitle: (obj) => obj.attributes.title,
        onImport: (objects) => {
          return {
            warnings: [
              {
                type: 'action_required',
                message: 'warning for test_import_warning_2',
                actionPath: '/some/url',
              },
            ],
          };
        },
      },
    });
  }

  public start() {}
  public stop() {}
}
