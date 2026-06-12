/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createRoot } from '@kbn/core-test-helpers-kbn-server';

describe('SO default search fields', () => {
  let root: ReturnType<typeof createRoot>;

  afterEach(async () => {
    try {
      await root?.shutdown();
    } catch (e) {
      /* trap */
    }
  });

  interface InvalidMappingTuple {
    type: string;
    field: string;
  }

  // identify / avoid scenarios of https://github.com/elastic/kibana/issues/130616
  it('make sure management types have the correct mappings for default search fields', async () => {
    root = createRoot({}, { oss: false });
    await root.preboot();
    const setup = await root.setup();

    const allTypes = setup.savedObjects.getTypeRegistry().getAllTypes();

    const defaultSearchFields = [
      ...allTypes.reduce((fieldSet, type) => {
        if (type.management?.defaultSearchField) {
          fieldSet.add(type.management.defaultSearchField);
        }
        return fieldSet;
      }, new Set<string>()),
    ];

    const invalidMappings: InvalidMappingTuple[] = [];

    const managementTypes = setup.savedObjects
      .getTypeRegistry()
      .getImportableAndExportableTypes()
      .filter((type) => type.management!.visibleInManagement ?? true);

    managementTypes.forEach((type) => {
      const mappingProps = type.mappings.properties;
      defaultSearchFields.forEach((searchField) => {
        if (mappingProps[searchField]) {
          const fieldDef = mappingProps[searchField];
          if (fieldDef.type !== 'text') {
            invalidMappings.push({
              type: type.name,
              field: searchField,
            });
          }
        }
      });
    });

    if (invalidMappings.length > 0) {
      // `fail()` no longer exists...
      expect(
        `fields registered as defaultSearchField by any type must be registered as text. Invalid mappings found: ${JSON.stringify(
          invalidMappings
        )}`
      ).toEqual('');
    }
  });
});
