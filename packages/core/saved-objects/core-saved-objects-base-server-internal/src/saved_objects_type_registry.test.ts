/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { SavedObjectTypeRegistry } from './saved_objects_type_registry';

const createType = (type: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'unknown',
  hidden: false,
  namespaceType: 'single' as 'single',
  mappings: { properties: {} },
  migrations: {},
  ...type,
});

describe('SavedObjectTypeRegistry', () => {
  let registry: SavedObjectTypeRegistry;

  beforeEach(() => {
    registry = new SavedObjectTypeRegistry();
  });

  describe('#registerType', () => {
    it('allows to register types', () => {
      registry.registerType(createType({ name: 'typeA' }));
      registry.registerType(createType({ name: 'typeB' }));
      registry.registerType(createType({ name: 'typeC' }));

      expect(
        registry
          .getAllTypes()
          .map((type) => type.name)
          .sort()
      ).toEqual(['typeA', 'typeB', 'typeC']);
    });

    it('throws when trying to register the same type twice', () => {
      registry.registerType(createType({ name: 'typeA' }));
      registry.registerType(createType({ name: 'typeB' }));
      expect(() => {
        registry.registerType(createType({ name: 'typeA' }));
      }).toThrowErrorMatchingInlineSnapshot(`"Type 'typeA' is already registered"`);
    });

    it('throws when `management.visibleInManagement` is specified but `management.importableAndExportable` is undefined or false', () => {
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              visibleInManagement: true,
            },
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeA: 'management.importableAndExportable' must be 'true' when specifying 'management.visibleInManagement'"`
      );

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              visibleInManagement: false,
            },
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeA: 'management.importableAndExportable' must be 'true' when specifying 'management.visibleInManagement'"`
      );

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              importableAndExportable: false,
              visibleInManagement: false,
            },
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeA: 'management.importableAndExportable' must be 'true' when specifying 'management.visibleInManagement'"`
      );
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              importableAndExportable: true,
              visibleInManagement: false,
            },
          })
        );
      }).not.toThrow();
    });

    it('throws when `management.onExport` is specified but `management.importableAndExportable` is undefined or false', () => {
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              onExport: (ctx, objs) => objs,
            },
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeA: 'management.importableAndExportable' must be 'true' when specifying 'management.onExport'"`
      );
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              importableAndExportable: false,
              onExport: (ctx, objs) => objs,
            },
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeA: 'management.importableAndExportable' must be 'true' when specifying 'management.onExport'"`
      );
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeA',
            management: {
              importableAndExportable: true,
              onExport: (ctx, objs) => objs,
            },
          })
        );
      }).not.toThrow();
    });

    it('throws when `hidden` is true and `hiddenFromHttpApis` is false', () => {
      expect(() => {
        registry.registerType(
          createType({
            name: 'typeHiddenA',
            hidden: true,
            hiddenFromHttpApis: false,
          })
        );
      }).toThrowErrorMatchingInlineSnapshot(
        `"Type typeHiddenA: 'hiddenFromHttpApis' cannot be 'false' when specifying 'hidden:true'"`
      );

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeHiddenA',
            hidden: true,
            hiddenFromHttpApis: true,
          })
        );
      }).not.toThrow();

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeHiddenA2',
            hidden: true,
          })
        );
      }).not.toThrow();

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeVisibleA',
            hidden: false,
          })
        );
      }).not.toThrow();

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeVisibleA1',
            hidden: false,
            hiddenFromHttpApis: false,
          })
        );
      }).not.toThrow();

      expect(() => {
        registry.registerType(
          createType({
            name: 'typeVisibleA2',
            hidden: false,
            hiddenFromHttpApis: true,
          })
        );
      }).not.toThrow();
    });
    // TODO: same test with 'onImport'
  });

  describe('#getType', () => {
    it(`retrieve a type by it's name`, () => {
      const typeA = createType({ name: 'typeA' });
      const typeB = createType({ name: 'typeB' });
      registry.registerType(typeA);
      registry.registerType(typeB);
      registry.registerType(createType({ name: 'typeC' }));

      expect(registry.getType('typeA')).toEqual(typeA);
      expect(registry.getType('typeB')).toEqual(typeB);
      expect(registry.getType('unknownType')).toBeUndefined();
    });

    it('forbids to mutate the registered types', () => {
      registry.registerType(
        createType({
          name: 'typeA',
          mappings: {
            properties: {
              someField: { type: 'text' },
            },
          },
        })
      );

      const typeA = registry.getType('typeA')!;

      expect(() => {
        typeA.migrations = {};
      }).toThrow();
      expect(() => {
        typeA.name = 'foo';
      }).toThrow();
      expect(() => {
        typeA.mappings.properties = {};
      }).toThrow();
      expect(() => {
        typeA.indexPattern = '.overrided';
      }).toThrow();
    });
  });

  describe('#getVisibleTypes', () => {
    it('returns only visible registered types', () => {
      const typeA = createType({ name: 'typeA', hidden: false });
      const typeB = createType({ name: 'typeB', hidden: true });
      const typeC = createType({ name: 'typeC', hidden: false });
      registry.registerType(typeA);
      registry.registerType(typeB);
      registry.registerType(typeC);

      const registered = registry.getVisibleTypes();
      expect(registered.length).toEqual(2);
      expect(registered).toContainEqual(typeA);
      expect(registered).toContainEqual(typeC);
    });

    it('does not mutate the registered types when altering the list', () => {
      registry.registerType(createType({ name: 'typeA', hidden: false }));
      registry.registerType(createType({ name: 'typeB', hidden: true }));
      registry.registerType(createType({ name: 'typeC', hidden: false }));

      const types = registry.getVisibleTypes();
      types.splice(0, 2);

      expect(registry.getVisibleTypes().length).toEqual(2);
    });
  });

  describe('#getAllTypes', () => {
    it('returns all registered types', () => {
      const typeA = createType({ name: 'typeA' });
      const typeB = createType({ name: 'typeB', hidden: true });
      const typeC = createType({ name: 'typeC' });
      registry.registerType(typeA);
      registry.registerType(typeB);

      const registered = registry.getAllTypes();
      expect(registered.length).toEqual(2);
      expect(registered).toContainEqual(typeA);
      expect(registered).toContainEqual(typeB);
      expect(registered).not.toContainEqual(typeC);
    });

    it('forbids to mutate the registered types', () => {
      registry.registerType(
        createType({
          name: 'typeA',
          mappings: {
            properties: {
              someField: { type: 'text' },
            },
          },
        })
      );
      registry.registerType(
        createType({
          name: 'typeB',
          migrations: {
            '1.0.0': jest.fn(),
          },
        })
      );

      const typeA = registry.getType('typeA')!;
      const typeB = registry.getType('typeB')!;

      expect(() => {
        typeA.migrations = {};
      }).toThrow();
      expect(() => {
        typeA.name = 'foo';
      }).toThrow();
      expect(() => {
        typeB.mappings.properties = {};
      }).toThrow();
      expect(() => {
        typeB.indexPattern = '.overrided';
      }).toThrow();
    });

    it('does not mutate the registered types when altering the list', () => {
      registry.registerType(createType({ name: 'typeA' }));
      registry.registerType(createType({ name: 'typeB' }));
      registry.registerType(createType({ name: 'typeC' }));

      const types = registry.getAllTypes();
      types.splice(0, 3);

      expect(registry.getAllTypes().length).toEqual(3);
    });
  });

  describe('#isNamespaceAgnostic', () => {
    const expectResult = (expected: boolean, schemaDefinition?: Partial<SavedObjectsType>) => {
      registry = new SavedObjectTypeRegistry();
      registry.registerType(createType({ name: 'foo', ...schemaDefinition }));
      expect(registry.isNamespaceAgnostic('foo')).toBe(expected);
    };

    it(`returns false when the type is not registered`, () => {
      expect(registry.isNamespaceAgnostic('unknownType')).toEqual(false);
    });

    it(`returns true for namespaceType 'agnostic'`, () => {
      expectResult(true, { namespaceType: 'agnostic' });
    });

    it(`returns false for other namespaceType`, () => {
      expectResult(false, { namespaceType: 'multiple' });
      expectResult(false, { namespaceType: 'multiple-isolated' });
      expectResult(false, { namespaceType: 'single' });
      expectResult(false, { namespaceType: undefined });
    });
  });

  describe('#isSingleNamespace', () => {
    const expectResult = (expected: boolean, schemaDefinition?: Partial<SavedObjectsType>) => {
      registry = new SavedObjectTypeRegistry();
      registry.registerType(createType({ name: 'foo', ...schemaDefinition }));
      expect(registry.isSingleNamespace('foo')).toBe(expected);
    };

    it(`returns true when the type is not registered`, () => {
      expect(registry.isSingleNamespace('unknownType')).toEqual(true);
    });

    it(`returns true for namespaceType 'single'`, () => {
      expectResult(true, { namespaceType: 'single' });
      expectResult(true, { namespaceType: undefined });
    });

    it(`returns false for other namespaceType`, () => {
      expectResult(false, { namespaceType: 'agnostic' });
      expectResult(false, { namespaceType: 'multiple' });
      expectResult(false, { namespaceType: 'multiple-isolated' });
    });
  });

  describe('#isMultiNamespace', () => {
    const expectResult = (expected: boolean, schemaDefinition?: Partial<SavedObjectsType>) => {
      registry = new SavedObjectTypeRegistry();
      registry.registerType(createType({ name: 'foo', ...schemaDefinition }));
      expect(registry.isMultiNamespace('foo')).toBe(expected);
    };

    it(`returns false when the type is not registered`, () => {
      expect(registry.isMultiNamespace('unknownType')).toEqual(false);
    });

    it(`returns true for namespaceType 'multiple' and 'multiple-isolated'`, () => {
      expectResult(true, { namespaceType: 'multiple' });
      expectResult(true, { namespaceType: 'multiple-isolated' });
    });

    it(`returns false for other namespaceType`, () => {
      expectResult(false, { namespaceType: 'agnostic' });
      expectResult(false, { namespaceType: 'single' });
      expectResult(false, { namespaceType: undefined });
    });
  });

  describe('#isShareable', () => {
    const expectResult = (expected: boolean, schemaDefinition?: Partial<SavedObjectsType>) => {
      registry = new SavedObjectTypeRegistry();
      registry.registerType(createType({ name: 'foo', ...schemaDefinition }));
      expect(registry.isShareable('foo')).toBe(expected);
    };

    it(`returns false when the type is not registered`, () => {
      expect(registry.isShareable('unknownType')).toEqual(false);
    });

    it(`returns true for namespaceType 'multiple'`, () => {
      expectResult(true, { namespaceType: 'multiple' });
    });

    it(`returns false for other namespaceType`, () => {
      expectResult(false, { namespaceType: 'agnostic' });
      expectResult(false, { namespaceType: 'multiple-isolated' });
      expectResult(false, { namespaceType: 'single' });
      expectResult(false, { namespaceType: undefined });
    });
  });

  describe('#isHidden', () => {
    it('returns correct value for the type', () => {
      registry.registerType(createType({ name: 'typeA', hidden: true }));
      registry.registerType(createType({ name: 'typeB', hidden: false }));

      expect(registry.isHidden('typeA')).toEqual(true);
      expect(registry.isHidden('typeB')).toEqual(false);
    });
    it('returns false when the type is not registered', () => {
      registry.registerType(createType({ name: 'typeA', hidden: true }));
      registry.registerType(createType({ name: 'typeB', hidden: false }));

      expect(registry.isHidden('unknownType')).toEqual(false);
    });
  });

  describe('#isHiddenFromHttpApis', () => {
    it('returns correct value for the type', () => {
      registry.registerType(createType({ name: 'typeA', hiddenFromHttpApis: true }));
      registry.registerType(createType({ name: 'typeB', hiddenFromHttpApis: false }));

      expect(registry.isHiddenFromHttpApis('typeA')).toEqual(true);
      expect(registry.isHiddenFromHttpApis('typeB')).toEqual(false);
    });
    it('returns true when the type is not registered', () => {
      registry.registerType(createType({ name: 'typeA', hiddenFromHttpApis: false }));
      registry.registerType(createType({ name: 'typeB', hiddenFromHttpApis: true }));

      expect(registry.isHiddenFromHttpApis('unknownType')).toEqual(false);
    });
  });

  describe('#getIndex', () => {
    it('returns correct value for the type', () => {
      registry.registerType(createType({ name: 'typeA', indexPattern: '.custom-index' }));
      registry.registerType(createType({ name: 'typeB', indexPattern: '.another-index' }));
      registry.registerType(createType({ name: 'typeWithNoIndex' }));

      expect(registry.getIndex('typeA')).toEqual('.custom-index');
      expect(registry.getIndex('typeB')).toEqual('.another-index');
      expect(registry.getIndex('typeWithNoIndex')).toBeUndefined();
    });
    it('returns undefined when the type is not registered', () => {
      registry.registerType(createType({ name: 'typeA', namespaceType: 'agnostic' }));
      registry.registerType(createType({ name: 'typeB', namespaceType: 'single' }));

      expect(registry.getIndex('unknownType')).toBeUndefined();
    });
  });

  describe('#isImportableAndExportable', () => {
    it('returns correct value for the type', () => {
      registry.registerType(
        createType({ name: 'typeA', management: { importableAndExportable: true } })
      );
      registry.registerType(
        createType({ name: 'typeB', management: { importableAndExportable: false } })
      );

      expect(registry.isImportableAndExportable('typeA')).toBe(true);
      expect(registry.isImportableAndExportable('typeB')).toBe(false);
    });
    it('returns false when the type is not registered', () => {
      registry.registerType(createType({ name: 'typeA', management: {} }));
      registry.registerType(createType({ name: 'typeB', management: {} }));

      expect(registry.isImportableAndExportable('typeA')).toBe(false);
    });
    it('returns false when management is not defined for the type', () => {
      registry.registerType(createType({ name: 'typeA' }));
      expect(registry.isImportableAndExportable('unknownType')).toBe(false);
    });
  });

  describe('#getImportableAndExportableTypes', () => {
    it('returns all registered types that are importable/exportable', () => {
      const typeA = createType({ name: 'typeA', management: { importableAndExportable: true } });
      const typeB = createType({ name: 'typeB' });
      const typeC = createType({ name: 'typeC', management: { importableAndExportable: false } });
      const typeD = createType({ name: 'typeD', management: { importableAndExportable: true } });
      registry.registerType(typeA);
      registry.registerType(typeB);
      registry.registerType(typeC);
      registry.registerType(typeD);

      const types = registry.getImportableAndExportableTypes();
      expect(types.length).toEqual(2);
      expect(types.map((t) => t.name)).toEqual(['typeA', 'typeD']);
    });
  });
});
