/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createDeclarativeComponent,
  tagDeclarativeComponent,
  getPartKey,
  getPresetKey,
} from './factory';

/** Helper type for accessing symbol-keyed static properties on components. */
type ComponentWithStatics = Record<symbol, unknown> & { displayName?: string };

describe('getPartKey', () => {
  it('should return a symbol keyed by assembly name.', () => {
    const key = getPartKey('TestAssembly');
    expect(typeof key).toBe('symbol');
    expect(key.toString()).toBe('Symbol(kbn.TestAssembly.part)');
  });

  it('should return the same symbol for the same assembly name.', () => {
    expect(getPartKey('A')).toBe(getPartKey('A'));
  });

  it('should return different symbols for different assembly names.', () => {
    expect(getPartKey('A')).not.toBe(getPartKey('B'));
  });
});

describe('getPresetKey', () => {
  it('should return a symbol keyed by assembly name.', () => {
    const key = getPresetKey('TestAssembly');
    expect(typeof key).toBe('symbol');
    expect(key.toString()).toBe('Symbol(kbn.TestAssembly.preset)');
  });

  it('should return the same symbol for the same assembly name.', () => {
    expect(getPresetKey('A')).toBe(getPresetKey('A'));
  });

  it('should return different symbols for different assembly names.', () => {
    expect(getPresetKey('A')).not.toBe(getPresetKey('B'));
  });
});

describe('createDeclarativeComponent', () => {
  it('should return a component that renders `null`.', () => {
    const Component = createDeclarativeComponent({ assembly: 'Asm', part: 'col' });
    expect(Component({})).toBeNull();
  });

  it('should set `displayName` from assembly and part.', () => {
    const Component = createDeclarativeComponent({ assembly: 'Table', part: 'column' });
    expect(Component.displayName).toBe('Table.column');
  });

  it('should include preset in `displayName` when provided.', () => {
    const Component = createDeclarativeComponent({
      assembly: 'Table',
      part: 'column',
      preset: 'name',
    });
    expect(Component.displayName).toBe('Table.column.name');
  });

  it('should set the part symbol key on the component.', () => {
    const Component = createDeclarativeComponent({ assembly: 'Asm', part: 'filter' });
    const key = getPartKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('filter');
  });

  it('should set the preset symbol key when preset is provided.', () => {
    const Component = createDeclarativeComponent({
      assembly: 'Asm',
      part: 'filter',
      preset: 'sort',
    });
    const key = getPresetKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('sort');
  });

  it('should not set the preset symbol key when preset is omitted.', () => {
    const Component = createDeclarativeComponent({ assembly: 'Asm', part: 'filter' });
    const key = getPresetKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBeUndefined();
  });
});

describe('tagDeclarativeComponent', () => {
  it('should return the same component reference.', () => {
    const Component = (): null => null;
    const result = tagDeclarativeComponent(Component, { assembly: 'Asm', part: 'col' });
    expect(result).toBe(Component);
  });

  it('should set `displayName` from assembly and part.', () => {
    const Component = (): null => null;
    tagDeclarativeComponent(Component, { assembly: 'Table', part: 'column' });
    expect((Component as unknown as ComponentWithStatics).displayName).toBe('Table.column');
  });

  it('should include preset in `displayName` when provided.', () => {
    const Component = (): null => null;
    tagDeclarativeComponent(Component, { assembly: 'Table', part: 'column', preset: 'name' });
    expect((Component as unknown as ComponentWithStatics).displayName).toBe('Table.column.name');
  });

  it('should set the part symbol key on the component.', () => {
    const Component = (): null => null;
    tagDeclarativeComponent(Component, { assembly: 'Asm', part: 'filter' });
    const key = getPartKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('filter');
  });

  it('should set the preset symbol key when preset is provided.', () => {
    const Component = (): null => null;
    tagDeclarativeComponent(Component, { assembly: 'Asm', part: 'filter', preset: 'sort' });
    const key = getPresetKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBe('sort');
  });

  it('should not set the preset symbol key when preset is omitted.', () => {
    const Component = (): null => null;
    tagDeclarativeComponent(Component, { assembly: 'Asm', part: 'filter' });
    const key = getPresetKey('Asm');
    expect((Component as unknown as ComponentWithStatics)[key]).toBeUndefined();
  });

  it('should work with generic components.', () => {
    const GenericComponent = <T extends Record<string, unknown>>(_props: { data: T }): null => null;
    tagDeclarativeComponent(GenericComponent, { assembly: 'Asm', part: 'widget' });

    const partKey = getPartKey('Asm');
    expect((GenericComponent as unknown as ComponentWithStatics)[partKey]).toBe('widget');
    expect((GenericComponent as unknown as ComponentWithStatics).displayName).toBe('Asm.widget');
  });
});
