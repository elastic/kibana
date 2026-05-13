/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EUI_COMPONENTS,
  resolveEuiTag,
  resolveReactComponentName,
  resolveTag,
} from './resolve_component_name';

describe('EUI_COMPONENTS', () => {
  it('contains known EUI components', () => {
    expect(EUI_COMPONENTS.has('EuiButton')).toBe(true);
    expect(EUI_COMPONENTS.has('EuiPanel')).toBe(true);
    expect(EUI_COMPONENTS.has('EuiFlexGroup')).toBe(true);
  });

  it('does not contain non-PascalCase exports', () => {
    // String constants or non-component exports should be excluded
    for (const name of EUI_COMPONENTS) {
      expect(name).toMatch(/^Eui[A-Z]/);
    }
  });
});

describe('resolveEuiTag', () => {
  it('resolves a class like euiButton to EuiButton', () => {
    const el = document.createElement('div');
    el.classList.add('euiButton');
    expect(resolveEuiTag(el)).toBe('EuiButton');
  });

  it('returns null when no EUI class matches an actual component', () => {
    const el = document.createElement('div');
    el.classList.add('euiNonExistentThing');
    expect(resolveEuiTag(el)).toBeNull();
  });

  it('returns null for elements without EUI classes', () => {
    const el = document.createElement('div');
    el.classList.add('myCustomClass');
    expect(resolveEuiTag(el)).toBeNull();
  });

  it('ignores classes that do not start with lowercase eui followed by uppercase', () => {
    const el = document.createElement('div');
    el.classList.add('euibutton'); // lowercase 'b' — should not match
    expect(resolveEuiTag(el)).toBeNull();
  });

  it('returns the first matching EUI component class', () => {
    const el = document.createElement('div');
    el.classList.add('someOtherClass', 'euiPanel');
    expect(resolveEuiTag(el)).toBe('EuiPanel');
  });
});

describe('resolveReactComponentName', () => {
  const attachFiber = (el: Element, fiber: unknown) => {
    const key = '__reactFiber$test123';
    Object.defineProperty(el, key, { value: fiber, configurable: true, enumerable: true });
  };

  it('returns null when no React fiber is attached', () => {
    const el = document.createElement('div');
    expect(resolveReactComponentName(el)).toBeNull();
  });

  it('returns null when fiber key exists but value is null', () => {
    const el = document.createElement('div');
    attachFiber(el, null);
    expect(resolveReactComponentName(el)).toBeNull();
  });

  it('returns component name when element is the root child', () => {
    const el = document.createElement('div');
    const hostFiber = { type: 'div', return: null as unknown };

    const componentFiber = {
      type: { name: 'EuiPanel' },
      return: null,
      child: hostFiber,
    };
    hostFiber.return = componentFiber;

    attachFiber(el, hostFiber);
    expect(resolveReactComponentName(el)).toBe('EuiPanel');
  });

  it('returns null for non-EUI component names', () => {
    const el = document.createElement('div');
    const hostFiber = { type: 'div', return: null as unknown };

    const componentFiber = {
      type: { name: 'ItemDetails' },
      return: null,
      child: hostFiber,
    };
    hostFiber.return = componentFiber;

    attachFiber(el, hostFiber);
    expect(resolveReactComponentName(el)).toBeNull();
  });

  it('returns displayName over name', () => {
    const el = document.createElement('div');
    const hostFiber = { type: 'div', return: null as unknown };

    const componentFiber = {
      type: { displayName: 'EuiButton', name: 'EuiButtonInternal' },
      return: null,
      child: hostFiber,
    };
    hostFiber.return = componentFiber;

    attachFiber(el, hostFiber);
    expect(resolveReactComponentName(el)).toBe('EuiButton');
  });

  it('returns null when element is not the root child', () => {
    const el = document.createElement('div');
    const innerFiber = { type: 'span' };
    const hostFiber = { type: 'div', return: null as unknown };

    const componentFiber = {
      type: { name: 'MyComponent' },
      return: null,
      // innerFiber is the first HostComponent child, not hostFiber
      child: innerFiber,
    };
    hostFiber.return = componentFiber;

    attachFiber(el, hostFiber);
    expect(resolveReactComponentName(el)).toBeNull();
  });

  it('filters out React internals like ForwardRef, Memo, Fragment', () => {
    const testFilteredName = (name: string) => {
      const el = document.createElement('div');
      const hostFiber = { type: 'div', return: null as unknown };
      const componentFiber = {
        type: { name },
        return: null,
        child: hostFiber,
      };
      hostFiber.return = componentFiber;
      attachFiber(el, hostFiber);
      return resolveReactComponentName(el);
    };

    expect(testFilteredName('ForwardRef')).toBeNull();
    expect(testFilteredName('Memo')).toBeNull();
    expect(testFilteredName('Fragment')).toBeNull();
    expect(testFilteredName('Context')).toBeNull();
    expect(testFilteredName('Provider')).toBeNull();
    expect(testFilteredName('Consumer')).toBeNull();
    expect(testFilteredName('Suspense')).toBeNull();
    expect(testFilteredName('Lazy')).toBeNull();
  });

  it('filters out names ending in Wrapper/Inner/Internal', () => {
    const testFilteredName = (name: string) => {
      const el = document.createElement('div');
      const hostFiber = { type: 'div', return: null as unknown };
      const componentFiber = {
        type: { name },
        return: null,
        child: hostFiber,
      };
      hostFiber.return = componentFiber;
      attachFiber(el, hostFiber);
      return resolveReactComponentName(el);
    };

    expect(testFilteredName('ButtonWrapper')).toBeNull();
    expect(testFilteredName('PanelInner')).toBeNull();
    expect(testFilteredName('MenuInternal')).toBeNull();
  });

  it('filters out names starting with underscore or shorter than 3 chars', () => {
    const testFilteredName = (name: string) => {
      const el = document.createElement('div');
      const hostFiber = { type: 'div', return: null as unknown };
      const componentFiber = {
        type: { name },
        return: null,
        child: hostFiber,
      };
      hostFiber.return = componentFiber;
      attachFiber(el, hostFiber);
      return resolveReactComponentName(el);
    };

    expect(testFilteredName('_Hidden')).toBeNull();
    expect(testFilteredName('Ab')).toBeNull();
    expect(testFilteredName('x')).toBeNull();
  });

  it('filters out lowercase-starting names', () => {
    const el = document.createElement('div');
    const hostFiber = { type: 'div', return: null as unknown };
    const componentFiber = {
      type: { name: 'myComponent' },
      return: null,
      child: hostFiber,
    };
    hostFiber.return = componentFiber;
    attachFiber(el, hostFiber);
    expect(resolveReactComponentName(el)).toBeNull();
  });

  it('validates EUI names against the real export set', () => {
    const testEuiName = (name: string) => {
      const el = document.createElement('div');
      const hostFiber = { type: 'div', return: null as unknown };
      const componentFiber = {
        type: { name },
        return: null,
        child: hostFiber,
      };
      hostFiber.return = componentFiber;
      attachFiber(el, hostFiber);
      return resolveReactComponentName(el);
    };

    // Real EUI component — should resolve
    expect(testEuiName('EuiButton')).toBe('EuiButton');
    // Fake EUI component — should be filtered
    expect(testEuiName('EuiFakeComponent')).toBeNull();
  });
});

describe('resolveTag', () => {
  it('prefers EUI class name over fiber and tag', () => {
    const el = document.createElement('div');
    el.classList.add('euiPanel');
    expect(resolveTag(el)).toBe('EuiPanel');
  });

  it('falls back to HTML tag name when no EUI class or fiber', () => {
    const el = document.createElement('section');
    expect(resolveTag(el)).toBe('section');
  });

  it('returns lowercase tag name for unknown elements', () => {
    const el = document.createElement('div');
    expect(resolveTag(el)).toBe('div');
  });
});
