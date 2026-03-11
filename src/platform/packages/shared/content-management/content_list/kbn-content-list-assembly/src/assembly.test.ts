/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createElement } from 'react';
import { defineAssembly } from './assembly';
import { getPartKey, getPresetKey, createDeclarativeComponent } from './factory';

/** Helper type for accessing symbol-keyed static properties on components. */
type ComponentWithStatics = Record<symbol, unknown> & { displayName?: string };

describe('defineAssembly', () => {
  it('should expose the assembly name.', () => {
    const asm = defineAssembly({ name: 'TestAssembly' });
    expect(asm.name).toBe('TestAssembly');
  });

  it('should preserve the literal type of the assembly name.', () => {
    const asm = defineAssembly({ name: 'LiteralName' });
    expect(asm.name).toBe('LiteralName');
  });

  it('should provide a `definePart` method.', () => {
    const asm = defineAssembly({ name: 'Asm' });
    expect(typeof asm.definePart).toBe('function');
  });
});

describe('definePart', () => {
  const asm = defineAssembly({ name: 'TestAssembly' });

  it('should return an object with `createPreset`, `createComponent`, `tagComponent`, `resolve`, and `parseChildren`.', () => {
    const part = asm.definePart({ name: 'column' });
    expect(typeof part.createPreset).toBe('function');
    expect(typeof part.createComponent).toBe('function');
    expect(typeof part.tagComponent).toBe('function');
    expect(typeof part.resolve).toBe('function');
    expect(typeof part.parseChildren).toBe('function');
  });
});

describe('createPreset', () => {
  const asm = defineAssembly({ name: 'Table' });

  interface TestPresets {
    name: { label: string };
    sort: { dir: string };
  }

  const column = asm.definePart<TestPresets>({ name: 'column' });

  it('should return a component that renders `null`.', () => {
    const Component = column.createPreset({ name: 'name' });
    expect(Component({ label: 'Test' })).toBeNull();
  });

  it('should include preset in `displayName`.', () => {
    const Component = column.createPreset({ name: 'name' });
    expect(Component.displayName).toBe('Table.column.name');
  });

  it('should set the part symbol key on the component.', () => {
    const Component = column.createPreset({ name: 'name' });
    const key = getPartKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('column');
  });

  it('should set the preset symbol key.', () => {
    const Component = column.createPreset({ name: 'name' });
    const key = getPresetKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('name');
  });
});

describe('createComponent', () => {
  const asm = defineAssembly({ name: 'Table' });
  const column = asm.definePart({ name: 'column' });

  it('should return a component that renders `null`.', () => {
    const Component = column.createComponent();
    expect(Component({})).toBeNull();
  });

  it('should set `displayName` from assembly and part.', () => {
    const Component = column.createComponent();
    expect(Component.displayName).toBe('Table.column');
  });

  it('should set the part symbol key on the component.', () => {
    const Component = column.createComponent();
    const key = getPartKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('column');
  });

  it('should not set the preset symbol key.', () => {
    const Component = column.createComponent();
    const key = getPresetKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBeUndefined();
  });
});

describe('tagComponent', () => {
  const asm = defineAssembly({ name: 'Table' });

  interface TestPresets {
    name: { label: string };
  }

  const column = asm.definePart<TestPresets>({ name: 'column' });

  it('should return the same component reference.', () => {
    const Component = (): null => null;
    const result = column.tagComponent(Component);
    expect(result).toBe(Component);
  });

  it('should set `displayName` from assembly and part.', () => {
    const Component = (): null => null;
    column.tagComponent(Component);
    expect((Component as unknown as ComponentWithStatics).displayName).toBe('Table.column');
  });

  it('should include preset in `displayName` when provided.', () => {
    const Component = (): null => null;
    column.tagComponent(Component, { preset: 'name' });
    expect((Component as unknown as ComponentWithStatics).displayName).toBe('Table.column.name');
  });

  it('should set the part symbol key on the component.', () => {
    const Component = (): null => null;
    column.tagComponent(Component);
    const key = getPartKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('column');
  });

  it('should set the preset symbol key when preset is provided.', () => {
    const Component = (): null => null;
    column.tagComponent(Component, { preset: 'name' });
    const key = getPresetKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('name');
  });

  it('should not set the preset symbol key when preset is omitted.', () => {
    const Component = (): null => null;
    column.tagComponent(Component);
    const key = getPresetKey('Table');
    expect((Component as unknown as ComponentWithStatics)[key]).toBeUndefined();
  });

  it('should work with generic components.', () => {
    const GenericComponent = <T extends Record<string, unknown>>(_props: { data: T }): null => null;
    column.tagComponent(GenericComponent);

    const partKey = getPartKey('Table');
    expect((GenericComponent as unknown as ComponentWithStatics)[partKey]).toBe('column');
    expect((GenericComponent as unknown as ComponentWithStatics).displayName).toBe('Table.column');
  });

  it('should work without an options argument.', () => {
    const Component = (): null => null;
    column.tagComponent(Component);
    const partKey = getPartKey('Table');
    expect((Component as unknown as ComponentWithStatics)[partKey]).toBe('column');
  });
});

describe('resolve', () => {
  const asm = defineAssembly({ name: 'ResolveTest' });

  interface TestPresets {
    name: { label: string };
    sort: { dir: string };
  }

  interface TestOutput {
    field: string;
    label: string;
  }

  interface TestContext {
    prefix: string;
  }

  const column = asm.definePart<TestPresets, TestOutput, TestContext>({ name: 'column' });

  column.createPreset({
    name: 'name',
    resolve: (attributes, context) => ({
      field: 'title',
      label: `${context.prefix}: ${attributes.label}`,
    }),
  });

  column.createPreset({ name: 'sort' });

  it('should resolve a preset with a registered resolver.', () => {
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: 'name',
      instanceId: 'name',
      attributes: { label: 'Title' },
    };
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toEqual({ field: 'title', label: 'Col: Title' });
  });

  it('should return `undefined` and warn for a preset without a resolver.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: 'sort',
      instanceId: 'sort',
      attributes: { dir: 'asc' },
    };
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No resolver found for part "column" preset "sort"')
    );
    warnSpy.mockRestore();
  });

  it('should return `undefined` and warn for a part without a preset.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: undefined,
      instanceId: 'custom',
      attributes: {},
    };
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No resolver found for part "column"')
    );
    warnSpy.mockRestore();
  });
});

describe('resolve with void context', () => {
  const asm = defineAssembly({ name: 'VoidContextTest' });

  interface ButtonPresets {
    save: { onClick?: () => void };
  }

  const button = asm.definePart<ButtonPresets>({ name: 'button' });

  button.createPreset({
    name: 'save',
    resolve: (attributes) => `Save: ${typeof attributes.onClick}`,
  });

  it('should resolve without requiring a context argument.', () => {
    const part = {
      type: 'part' as const,
      part: 'button',
      preset: 'save',
      instanceId: 'save',
      attributes: {},
    };
    const result = button.resolve(part);
    expect(result).toBe('Save: undefined');
  });
});

describe('part.parseChildren', () => {
  const assembly = 'PartParseTest';
  const asm = defineAssembly({ name: assembly });

  interface ColumnPresets {
    name: { label: string };
  }

  const column = asm.definePart<ColumnPresets>({ name: 'column' });
  const NameCol = column.createPreset({ name: 'name' });

  const spacer = asm.definePart({ name: 'spacer' });
  const Spacer = spacer.createPreset({ name: 'spacer' });

  it('should return only parts matching this part type.', () => {
    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      createElement(Spacer, { key: '2' }),
    ];
    const result = column.parseChildren(children);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ type: 'part', part: 'column', preset: 'name' })
    );
  });

  it('should return an empty array when no parts match.', () => {
    const children = [createElement(Spacer, { key: '1' })];
    const result = column.parseChildren(children);
    expect(result).toEqual([]);
  });

  it('should return an empty array for undefined children.', () => {
    const result = column.parseChildren(undefined);
    expect(result).toEqual([]);
  });

  it('should exclude passthrough children.', () => {
    const div = createElement('div', { key: 'div' });
    const children = [createElement(NameCol, { key: '1', label: 'Title' }), div];
    const result = column.parseChildren(children);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ type: 'part', part: 'column' }));
  });

  it('should warn for function component children that are not registered parts.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const UnknownComponent = (): null => null;
    UnknownComponent.displayName = 'UnknownComponent';

    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      createElement(UnknownComponent, { key: '2' }),
    ];
    column.parseChildren(children);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '<UnknownComponent> is not a registered "column" part and may not be rendered'
      )
    );
    warnSpy.mockRestore();
  });

  it('should not warn for intrinsic HTML element children.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const div = createElement('div', { key: 'div' });

    const children = [createElement(NameCol, { key: '1', label: 'Title' }), div];
    column.parseChildren(children);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('createComponent with resolve', () => {
  const asm = defineAssembly({ name: 'ComponentResolveTest' });

  interface ColumnPresets {
    name: { label: string };
  }

  interface ColumnOutput {
    field: string;
    label: string;
  }

  interface ColumnContext {
    prefix: string;
  }

  const column = asm.definePart<ColumnPresets, ColumnOutput, ColumnContext>({ name: 'column' });

  column.createPreset({
    name: 'name',
    resolve: (attributes, context) => ({
      field: 'title',
      label: `${context.prefix}: ${attributes.label}`,
    }),
  });

  interface CustomColumnProps {
    field: string;
    label: string;
  }

  column.createComponent<CustomColumnProps>({
    resolve: (attributes, context) => ({
      field: attributes.field,
      label: `${context.prefix}: ${attributes.label}`,
    }),
  });

  it('should resolve a preset part via the preset resolver.', () => {
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: 'name',
      instanceId: 'name',
      attributes: { label: 'Title' },
    };
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toEqual({ field: 'title', label: 'Col: Title' });
  });

  it('should resolve a custom part via the component resolver.', () => {
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: undefined,
      instanceId: 'custom',
      attributes: { field: 'size', label: 'Size' },
    };
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toEqual({ field: 'size', label: 'Col: Size' });
  });

  it('should prefer the preset resolver over the component resolver.', () => {
    const part = {
      type: 'part' as const,
      part: 'column',
      preset: 'name',
      instanceId: 'name',
      attributes: { label: 'Title' },
    };
    // Should use the preset resolver, not the custom one.
    const result = column.resolve(part, { prefix: 'Col' });
    expect(result).toEqual({ field: 'title', label: 'Col: Title' });
  });
});

describe('assembly.parseChildren', () => {
  const assembly = 'ParseTest';
  const asm = defineAssembly({ name: assembly });

  const NameCol = createDeclarativeComponent<{ label: string }>({
    assembly,
    part: 'column',
    preset: 'name',
  });

  const SpacerPart = createDeclarativeComponent<{ size?: string }>({
    assembly,
    part: 'spacer',
    preset: 'spacer',
  });

  it('should parse all part types in one pass.', () => {
    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      createElement(SpacerPart, { key: '2', size: 'm' }),
    ];
    const result = asm.parseChildren(children);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({ type: 'part', part: 'column', instanceId: 'name' })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ type: 'part', part: 'spacer', instanceId: 'spacer' })
    );
  });

  it('should return an empty array for undefined children.', () => {
    const result = asm.parseChildren(undefined);
    expect(result).toEqual([]);
  });

  it('should preserve interleaved order with passthrough children.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const div = createElement('div', { key: 'div' });
    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      div,
      createElement(SpacerPart, { key: '2', size: 'm' }),
    ];
    const result = asm.parseChildren(children);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(expect.objectContaining({ type: 'part', part: 'column' }));
    expect(result[1]).toEqual(expect.objectContaining({ type: 'child' }));
    expect(result[2]).toEqual(expect.objectContaining({ type: 'part', part: 'spacer' }));
    warnSpy.mockRestore();
  });

  it('should warn by default for function component children.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const UnknownComponent = (): null => null;
    UnknownComponent.displayName = 'MyCallout';

    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      createElement(UnknownComponent, { key: '2' }),
    ];
    asm.parseChildren(children);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `<MyCallout> is not a registered "${assembly}" part and may not be rendered`
      )
    );
    warnSpy.mockRestore();
  });

  it('should not warn when `supportsOtherChildren` is `true`.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const UnknownComponent = (): null => null;
    UnknownComponent.displayName = 'MyCallout';

    const children = [
      createElement(NameCol, { key: '1', label: 'Title' }),
      createElement(UnknownComponent, { key: '2' }),
    ];
    asm.parseChildren(children, { supportsOtherChildren: true });

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should not warn for intrinsic HTML element passthrough children.', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const div = createElement('div', { key: 'div' });

    const children = [createElement(NameCol, { key: '1', label: 'Title' }), div];
    asm.parseChildren(children);

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
