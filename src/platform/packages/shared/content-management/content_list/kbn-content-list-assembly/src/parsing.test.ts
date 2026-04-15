/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement, Fragment } from 'react';
import { parseDeclarativeChildren } from './parsing';
import { createDeclarativeComponent } from './factory';

const assembly = 'TestAssembly';

const NameColumn = createDeclarativeComponent<{ label: string }>({
  assembly,
  part: 'column',
  preset: 'name',
});
const SortColumn = createDeclarativeComponent<{ dir: string }>({
  assembly,
  part: 'column',
  preset: 'sort',
});
const GenericColumn = createDeclarativeComponent<{ id: string }>({ assembly, part: 'column' });
const SpacerPart = createDeclarativeComponent<{ size?: string }>({
  assembly,
  part: 'spacer',
  preset: 'spacer',
});

// A preset that can repeat (like ButtonControl).
const ButtonColumn = createDeclarativeComponent<{ id?: string; label: string }>({
  assembly,
  part: 'column',
  preset: 'button',
});

describe('parseDeclarativeChildren', () => {
  describe('empty / undefined children', () => {
    it('should return an empty array for `undefined` children.', () => {
      const result = parseDeclarativeChildren(undefined, assembly);
      expect(result).toEqual([]);
    });

    it('should return an empty array for `null` children.', () => {
      const result = parseDeclarativeChildren(null, assembly);
      expect(result).toEqual([]);
    });
  });

  describe('declarative parts', () => {
    it('should parse a single preset component using raw props as attributes.', () => {
      const children = createElement(NameColumn, { label: 'Title' });
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toEqual([
        {
          type: 'part',
          part: 'column',
          preset: 'name',
          instanceId: 'name',
          attributes: { label: 'Title' },
        },
      ]);
    });

    it('should parse multiple preset components preserving order.', () => {
      const children = [
        createElement(SortColumn, { key: '1', dir: 'asc' }),
        createElement(NameColumn, { key: '2', label: 'Title' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'part',
          part: 'column',
          preset: 'sort',
          instanceId: 'sort',
        })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'part',
          part: 'column',
          preset: 'name',
          instanceId: 'name',
        })
      );
    });

    it('should use raw props as attributes.', () => {
      const children = createElement(SortColumn, { dir: 'desc' });
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'part',
          preset: 'sort',
          instanceId: 'sort',
          attributes: { dir: 'desc' },
        })
      );
    });

    it('should use `props.id` as `instanceId` when provided.', () => {
      const children = createElement(GenericColumn, { id: 'custom-col' });
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'part',
          preset: undefined,
          instanceId: 'custom-col',
        }),
      ]);
    });

    it('should prefer `props.id` over static preset for `instanceId`.', () => {
      const children = createElement(NameColumn, { id: 'my-name', label: 'Title' } as any);
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'part',
          preset: 'name',
          instanceId: 'my-name',
        }),
      ]);
    });
  });

  describe('multiple part types', () => {
    it('should parse all part types in a single pass.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement(SpacerPart, { key: '2', size: 'm' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'part',
          part: 'column',
          preset: 'name',
          instanceId: 'name',
        })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'part',
          part: 'spacer',
          preset: 'spacer',
          instanceId: 'spacer',
        })
      );
    });

    it('should preserve interleaved order across part types.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement(SpacerPart, { key: '2', size: 'm' }),
        createElement(SortColumn, { key: '3', dir: 'asc' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(
        expect.objectContaining({ type: 'part', part: 'column', instanceId: 'name' })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ type: 'part', part: 'spacer', instanceId: 'spacer' })
      );
      expect(result[2]).toEqual(
        expect.objectContaining({ type: 'part', part: 'column', instanceId: 'sort' })
      );
    });

    it('should use `props.id` as `instanceId` for generic parts.', () => {
      const children = createElement(GenericColumn, { id: 'custom-col' });
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toEqual([
        expect.objectContaining({
          type: 'part',
          part: 'column',
          preset: undefined,
          instanceId: 'custom-col',
        }),
      ]);
    });
  });

  describe('auto-generated instance IDs', () => {
    it('should auto-generate IDs when a preset repeats without `id`.', () => {
      const children = [
        createElement(ButtonColumn, { key: '1', label: 'Save' }),
        createElement(ButtonColumn, { key: '2', label: 'Delete' }),
        createElement(ButtonColumn, { key: '3', label: 'Cancel' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(
        expect.objectContaining({ preset: 'button', instanceId: 'button' })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ preset: 'button', instanceId: 'button-1' })
      );
      expect(result[2]).toEqual(
        expect.objectContaining({ preset: 'button', instanceId: 'button-2' })
      );
    });

    it('should auto-generate IDs for generic parts without preset or `id`.', () => {
      const children = [
        createElement(GenericColumn, { key: '1', id: '' } as any),
        createElement(GenericColumn, { key: '2' } as any),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ preset: undefined, instanceId: 'column-0' })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ preset: undefined, instanceId: 'column-1' })
      );
    });

    it('should coexist: explicit `id` + auto-generated IDs without collision.', () => {
      const children = [
        createElement(ButtonColumn, { key: '1', id: 'save', label: 'Save' } as any),
        createElement(ButtonColumn, { key: '2', label: 'Delete' }),
        createElement(ButtonColumn, { key: '3', label: 'Cancel' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ preset: 'button', instanceId: 'save' }));
      expect(result[1]).toEqual(
        expect.objectContaining({ preset: 'button', instanceId: 'button' })
      );
      expect(result[2]).toEqual(
        expect.objectContaining({ preset: 'button', instanceId: 'button-1' })
      );
    });

    it('should skip collisions with explicit IDs when auto-generating.', () => {
      const children = [
        createElement(ButtonColumn, { key: '1', id: 'button-1', label: 'Explicit' } as any),
        createElement(ButtonColumn, { key: '2', label: 'First auto' }),
        createElement(ButtonColumn, { key: '3', label: 'Second auto' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ instanceId: 'button-1' }));
      expect(result[1]).toEqual(expect.objectContaining({ instanceId: 'button' }));
      expect(result[2]).toEqual(expect.objectContaining({ instanceId: 'button-2' }));
    });

    it('should enforce duplicates per part type, not globally.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement(SpacerPart, { key: '2', size: 'm' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      // 'name' and 'spacer' are different part types, so no collision.
      expect(result).toHaveLength(2);
    });

    it('should auto-generate IDs when a preset repeats within the same part type.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'First' }),
        createElement(NameColumn, { key: '2', label: 'Second' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ instanceId: 'name-1' }));
    });
  });

  describe('duplicate explicit ID handling', () => {
    it('should warn and drop when two elements have the same explicit `id`.', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const children = [
        createElement(ButtonColumn, { key: '1', id: 'save', label: 'Save' } as any),
        createElement(ButtonColumn, { key: '2', id: 'save', label: 'Also Save' } as any),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ instanceId: 'save' }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate column id: "save"'));

      warnSpy.mockRestore();
    });

    it('should warn and drop duplicate explicit IDs within the same part type.', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const children = [
        createElement(NameColumn, { key: '1', id: 'col-a', label: 'First' } as any),
        createElement(NameColumn, { key: '2', id: 'col-a', label: 'Second' } as any),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate column id: "col-a"'));

      warnSpy.mockRestore();
    });
  });

  describe('passthrough children', () => {
    it('should treat non-declarative elements as passthrough children.', () => {
      const div = createElement('div', { key: 'div' });
      const result = parseDeclarativeChildren(div, assembly);
      expect(result).toEqual([{ type: 'child', node: div }]);
    });

    it('should treat string children as passthrough.', () => {
      const result = parseDeclarativeChildren('hello', assembly);
      expect(result).toEqual([{ type: 'child', node: 'hello' }]);
    });

    it('should treat number children as passthrough.', () => {
      const result = parseDeclarativeChildren(42, assembly);
      expect(result).toEqual([{ type: 'child', node: 42 }]);
    });

    it('should include passthrough children in the correct position.', () => {
      const div = createElement('div', { key: 'div' });
      const children = [
        createElement(NameColumn, { key: '1', label: 'Title' }),
        div,
        createElement(SpacerPart, { key: '2', size: 's' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ type: 'part', part: 'column' }));
      expect(result[1]).toEqual(expect.objectContaining({ type: 'child' }));
      expect(result[2]).toEqual(expect.objectContaining({ type: 'part', part: 'spacer' }));
    });
  });

  describe('mixed children ordering', () => {
    it('should preserve order of parts and passthrough children.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement('div', { key: 'div' }),
        createElement(SortColumn, { key: '2', dir: 'asc' }),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ type: 'child' }));
      expect(result[2]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'sort' }));
    });
  });

  describe('fragment unwrapping', () => {
    it('should unwrap a single fragment and parse inner parts.', () => {
      const children = createElement(
        Fragment,
        null,
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement(SortColumn, { key: '2', dir: 'asc' })
      );
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'sort' }));
    });

    it('should unwrap nested fragments preserving order.', () => {
      const children = [
        createElement(NameColumn, { key: '1', label: 'First' }),
        createElement(
          Fragment,
          { key: 'frag' },
          createElement(SortColumn, { key: '2', dir: 'asc' })
        ),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ instanceId: 'sort' }));
    });

    it('should handle fragments containing passthrough children.', () => {
      const children = createElement(
        Fragment,
        null,
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement('div', { key: 'div' })
      );
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ type: 'child' }));
    });

    it('should handle deeply nested fragments.', () => {
      const children = createElement(
        Fragment,
        null,
        createElement(Fragment, null, createElement(NameColumn, { label: 'Deep' }))
      );
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ type: 'part', instanceId: 'name' }));
    });

    it('should still enforce duplicate detection across fragments.', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const children = [
        createElement(NameColumn, { key: '1', id: 'same', label: 'First' } as any),
        createElement(
          Fragment,
          { key: 'frag' },
          createElement(NameColumn, { key: '2', id: 'same', label: 'Second' } as any)
        ),
      ];
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({ instanceId: 'same' }));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate column id: "same"'));

      warnSpy.mockRestore();
    });

    it('should unwrap fragments and preserve interleaved order across part types.', () => {
      const children = createElement(
        Fragment,
        null,
        createElement(NameColumn, { key: '1', label: 'Title' }),
        createElement(SpacerPart, { key: '2', size: 'm' }),
        createElement(SortColumn, { key: '3', dir: 'asc' })
      );
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ part: 'column', instanceId: 'name' }));
      expect(result[1]).toEqual(expect.objectContaining({ part: 'spacer', instanceId: 'spacer' }));
      expect(result[2]).toEqual(expect.objectContaining({ part: 'column', instanceId: 'sort' }));
    });
  });

  describe('attributes extraction', () => {
    it('should use raw props as attributes.', () => {
      const children = createElement(NameColumn, { label: 'Title' });
      const result = parseDeclarativeChildren(children, assembly);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'part',
          attributes: { label: 'Title' },
        })
      );
    });
  });
});
