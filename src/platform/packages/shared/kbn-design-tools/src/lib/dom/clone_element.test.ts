/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  unfreezeChildren,
  reflowAfterStyleChange,
  reflowAfterTextChange,
  reflowManagedStyle,
  reflowManagedText,
  collectTextReflowDimensions,
  collectStyleReflowDimensions,
  restoreDimensions,
  deduplicateSvgIds,
  roundRect,
  setImportant,
  softHideElement,
  restoreHiddenElement,
  cloneElement,
  copyStylesDeep,
  widenForTruncation,
} from './clone_element';
import { DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../constants';
import '../tests/mocks';

const mockRect = (x = 0, y = 0, w = 100, h = 50): DOMRect => new DOMRect(x, y, w, h) as DOMRect;

describe('setImportant', () => {
  it('should set property with important priority', () => {
    const el = document.createElement('div');
    setImportant(el, 'width', '200px');
    expect(el.style.getPropertyValue('width')).toBe('200px');
    expect(el.style.getPropertyPriority('width')).toBe('important');
  });
});

describe('softHideElement / restoreHiddenElement', () => {
  it('should hide and restore an element', () => {
    const el = document.createElement('div');
    el.style.transform = 'translateX(10px)';

    softHideElement(el);
    expect(el.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(true);
    expect(el.getAttribute(DEVTOOL_HIDDEN_ATTR)).toBe('translateX(10px)');
    expect(el.style.getPropertyValue('visibility')).toBe('hidden');

    restoreHiddenElement(el);
    expect(el.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
    expect(el.style.transform).toBe('translateX(10px)');
  });

  it('should save empty string when element has no transform', () => {
    const el = document.createElement('div');
    softHideElement(el);
    expect(el.getAttribute(DEVTOOL_HIDDEN_ATTR)).toBe('');
  });
});

describe('unfreezeChildren', () => {
  it('should remove frozen width from children', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    child.style.width = '50px';
    parent.appendChild(child);

    unfreezeChildren(parent, 'width');
    expect(child.style.width).toBe('');
  });

  it('should constrain media elements with max-width/max-height instead of removing', () => {
    const parent = document.createElement('div');
    const img = document.createElement('img');
    img.style.width = '200px';
    img.style.height = '100px';
    parent.appendChild(img);

    unfreezeChildren(parent, 'width');
    expect(img.style.getPropertyValue('max-width')).toBe('100%');
    expect(img.style.getPropertyValue('max-height')).toBe('100%');
    expect(img.style.getPropertyValue('height')).toBe('auto');
    expect(img.style.getPropertyValue('width')).toBe('auto');
  });

  it('should recurse into nested children', () => {
    const root = document.createElement('div');
    const mid = document.createElement('div');
    const leaf = document.createElement('div');
    leaf.style.height = '30px';
    mid.appendChild(leaf);
    root.appendChild(mid);

    unfreezeChildren(root, 'height');
    expect(mid.style.height).toBe('');
    expect(leaf.style.height).toBe('');
  });
});

describe('reflowAfterStyleChange', () => {
  it('should unfreeze children for width change', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    parent.appendChild(child);

    reflowAfterStyleChange(parent, 'width');
    expect(child.style.width).toBe('');
  });

  it('should unfreeze both dimensions for padding change', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    child.style.height = '30px';
    parent.appendChild(child);

    reflowAfterStyleChange(parent, 'padding');
    expect(child.style.width).toBe('');
    expect(child.style.height).toBe('');
  });

  it('should unfreeze ancestors up to root when root is provided', () => {
    const root = document.createElement('div');
    const mid = document.createElement('div');
    const child = document.createElement('div');
    mid.style.width = '200px';
    mid.style.setProperty('max-width', '200px');
    root.appendChild(mid);
    mid.appendChild(child);

    reflowAfterStyleChange(child, 'width', root);
    expect(mid.style.width).toBe('');
    expect(mid.style.getPropertyValue('max-width')).toBe('');
  });

  it('should not walk past the root boundary', () => {
    const wrapper = document.createElement('div');
    const root = document.createElement('div');
    const child = document.createElement('div');
    wrapper.style.width = '500px';
    root.style.width = '300px';
    wrapper.appendChild(root);
    root.appendChild(child);

    reflowAfterStyleChange(child, 'width', root);
    // Root is unfrozen (it's inside the boundary)
    expect(root.style.width).toBe('');
    // Wrapper is outside the boundary — untouched
    expect(wrapper.style.width).toBe('500px');
  });
});

describe('reflowAfterTextChange', () => {
  it('should remove width and height from parent and unfreeze children', () => {
    const parent = document.createElement('div');
    parent.style.width = '100px';
    parent.style.height = '50px';
    const child = document.createElement('span');
    child.style.width = '80px';
    child.style.height = '30px';
    parent.appendChild(child);

    reflowAfterTextChange(parent);
    expect(parent.style.width).toBe('');
    expect(parent.style.height).toBe('');
    expect(child.style.width).toBe('');
    expect(child.style.height).toBe('');
  });
});

describe('reflowManagedStyle', () => {
  it('should unfreeze children when element is inside a managed tree', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    parent.appendChild(child);
    managed.appendChild(parent);

    reflowManagedStyle(parent, 'width');
    expect(child.style.width).toBe('');
  });

  it('should be a no-op when element is NOT inside a managed tree', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    child.style.width = '50px';
    parent.appendChild(child);

    reflowManagedStyle(parent, 'width');
    expect(child.style.width).toBe('50px');
  });
});

describe('reflowManagedText', () => {
  it('should unfreeze parent dimensions when inside a managed tree', () => {
    const managed = document.createElement('div');
    managed.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const parent = document.createElement('div');
    parent.style.width = '100px';
    parent.style.height = '50px';
    managed.appendChild(parent);

    reflowManagedText(parent);
    expect(parent.style.width).toBe('');
    expect(parent.style.height).toBe('');
  });

  it('should be a no-op when parent is NOT inside a managed tree', () => {
    const parent = document.createElement('div');
    parent.style.width = '100px';

    reflowManagedText(parent);
    expect(parent.style.width).toBe('100px');
  });

  it('should be a no-op when parent is null', () => {
    expect(() => reflowManagedText(null)).not.toThrow();
  });
});

describe('collectTextReflowDimensions', () => {
  it('should capture parent and children dimensions', () => {
    const parent = document.createElement('div');
    setImportant(parent, 'width', '200px');
    setImportant(parent, 'height', '100px');
    const child = document.createElement('span');
    setImportant(child, 'width', '80px');
    setImportant(child, 'height', '40px');
    parent.appendChild(child);

    const dims = collectTextReflowDimensions(parent);

    expect(dims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ element: parent, property: 'width', value: '200px' }),
        expect.objectContaining({ element: parent, property: 'height', value: '100px' }),
        expect.objectContaining({ element: child, property: 'width', value: '80px' }),
        expect.objectContaining({ element: child, property: 'height', value: '40px' }),
      ])
    );
  });

  it('should skip elements without inline dimensions', () => {
    const parent = document.createElement('div');
    const child = document.createElement('span');
    parent.appendChild(child);

    const dims = collectTextReflowDimensions(parent);
    expect(dims).toHaveLength(0);
  });
});

describe('collectStyleReflowDimensions', () => {
  it('should capture child dimensions for width change', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    setImportant(child, 'width', '50px');
    parent.appendChild(child);

    const dims = collectStyleReflowDimensions(parent, 'width');
    expect(dims).toEqual([
      expect.objectContaining({ element: child, property: 'width', value: '50px' }),
    ]);
  });

  it('should capture ancestor dimensions up to root', () => {
    const root = document.createElement('div');
    const mid = document.createElement('div');
    const child = document.createElement('div');
    setImportant(mid, 'width', '300px');
    setImportant(mid, 'max-width', '300px');
    root.appendChild(mid);
    mid.appendChild(child);

    const dims = collectStyleReflowDimensions(child, 'width', root);
    expect(dims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ element: mid, property: 'width', value: '300px' }),
        expect.objectContaining({ element: mid, property: 'max-width', value: '300px' }),
      ])
    );
  });

  it('should capture both dimensions for padding change', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    setImportant(child, 'width', '50px');
    setImportant(child, 'height', '30px');
    parent.appendChild(child);

    const dims = collectStyleReflowDimensions(parent, 'padding');
    expect(dims).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ element: child, property: 'width', value: '50px' }),
        expect.objectContaining({ element: child, property: 'height', value: '30px' }),
      ])
    );
  });
});

describe('restoreDimensions', () => {
  it('should restore previously collected dimensions', () => {
    const el = document.createElement('div');
    setImportant(el, 'width', '100px');
    setImportant(el, 'height', '50px');

    const dims = collectTextReflowDimensions(el);
    reflowAfterTextChange(el);

    expect(el.style.width).toBe('');
    expect(el.style.height).toBe('');

    restoreDimensions(dims);
    expect(el.style.getPropertyValue('width')).toBe('100px');
    expect(el.style.getPropertyValue('height')).toBe('50px');
  });
});

describe('roundRect', () => {
  it('should round position and ceil dimensions', () => {
    const input = { left: 10.3, top: 20.7, width: 99.2, height: 49.8 } as DOMRect;
    Object.assign(input, { x: 10.3, y: 20.7, toJSON() {} });
    const r = roundRect(input);
    expect(r.left).toBe(10);
    expect(r.top).toBe(21);
    expect(r.width).toBe(100);
    expect(r.height).toBe(50);
    expect(r.right).toBe(110);
    expect(r.bottom).toBe(71);
  });
});

describe('deduplicateSvgIds', () => {
  it('should rewrite IDs and update url() references', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <svg>
        <defs>
          <clipPath id="clip1"><rect /></clipPath>
        </defs>
        <rect clip-path="url(#clip1)" />
      </svg>
    `;

    deduplicateSvgIds(root);

    const clipPath = root.querySelector('clipPath')!;
    expect(clipPath.id).not.toBe('clip1');
    expect(clipPath.id).toMatch(/^clip1_[a-f0-9]{8}$/);

    const rect = root.querySelector('rect[clip-path]')!;
    expect(rect.getAttribute('clip-path')).toBe(`url(#${clipPath.id})`);
  });

  it('should update href="#id" references', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <svg>
        <defs><linearGradient id="grad1" /></defs>
        <use href="#grad1" />
      </svg>
    `;

    deduplicateSvgIds(root);

    const grad = root.querySelector('linearGradient')!;
    const use = root.querySelector('use')!;
    expect(use.getAttribute('href')).toBe(`#${grad.id}`);
  });

  it('should handle multiple SVGs independently', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <svg><defs><clipPath id="a" /></defs></svg>
      <svg><defs><clipPath id="a" /></defs></svg>
    `;

    deduplicateSvgIds(root);

    const clips = root.querySelectorAll('clipPath');
    expect(clips[0].id).not.toBe(clips[1].id);
  });
});

describe('cloneElement', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.textContent = 'hello';
    target.getBoundingClientRect = () => mockRect(20, 10, 100, 40);
    document.body.appendChild(target);
  });

  afterEach(() => target.remove());

  it('should return a fixed-position clone with managed attribute', () => {
    const { clone, rect } = cloneElement(target, 9001);

    expect(clone.style.getPropertyValue('position')).toBe('fixed');
    expect(clone.style.getPropertyValue('left')).toBe('20px');
    expect(clone.style.getPropertyValue('top')).toBe('10px');
    expect(clone.hasAttribute(DEVTOOL_MANAGED_ATTR)).toBe(true);
    expect(rect.width).toBe(100);
  });

  it('should keep hidden descendants invisible in clone', () => {
    const child = document.createElement('span');
    child.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    target.appendChild(child);

    const { clone } = cloneElement(target, 9001);

    const clonedChild = clone.querySelector('span')!;
    expect(clonedChild.style.visibility).toBe('hidden');
    expect(clonedChild.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
  });
});

describe('widenForTruncation', () => {
  it('should widen clone when target has a truncation class and scrollWidth exceeds rect', () => {
    const target = document.createElement('span');
    target.classList.add('eui-textTruncate');
    target.textContent = 'long text';
    document.body.appendChild(target);

    const clone = document.createElement('span');
    clone.textContent = 'long text';
    Object.defineProperty(clone, 'scrollWidth', { value: 150, configurable: true });

    const rect = new DOMRect(10, 20, 100, 30);
    const result = widenForTruncation(target, clone, rect);

    expect(result.width).toBe(150);
    expect(result.x).toBe(10);
    expect(result.height).toBe(30);
    expect(clone.style.getPropertyValue('width')).toBe('150px');

    target.remove();
  });

  it('should widen when truncation class is on a descendant', () => {
    const target = document.createElement('a');
    const child = document.createElement('span');
    child.classList.add('eui-textTruncate');
    child.textContent = 'Stack Management';
    target.appendChild(child);
    document.body.appendChild(target);

    const clone = document.createElement('a');
    const cloneChild = document.createElement('span');
    cloneChild.textContent = 'Stack Management';
    clone.appendChild(cloneChild);
    Object.defineProperty(clone, 'scrollWidth', { value: 160, configurable: true });

    const rect = new DOMRect(0, 0, 130, 40);
    const result = widenForTruncation(target, clone, rect);

    expect(result.width).toBe(160);

    target.remove();
  });

  it('should return original rect when no truncation classes exist', () => {
    const target = document.createElement('div');
    target.textContent = 'no truncation';
    document.body.appendChild(target);

    const clone = document.createElement('div');
    Object.defineProperty(clone, 'scrollWidth', { value: 200, configurable: true });

    const rect = new DOMRect(0, 0, 100, 50);
    const result = widenForTruncation(target, clone, rect);

    expect(result).toBe(rect);
    expect(result.width).toBe(100);

    target.remove();
  });

  it('should return original rect when scrollWidth does not exceed rect width', () => {
    const target = document.createElement('span');
    target.classList.add('eui-textTruncate');
    document.body.appendChild(target);

    const clone = document.createElement('span');
    Object.defineProperty(clone, 'scrollWidth', { value: 80, configurable: true });

    const rect = new DOMRect(0, 0, 100, 30);
    const result = widenForTruncation(target, clone, rect);

    expect(result).toBe(rect);

    target.remove();
  });

  it('should ceil fractional scrollWidth values', () => {
    const target = document.createElement('span');
    target.classList.add('eui-textTruncate');
    document.body.appendChild(target);

    const clone = document.createElement('span');
    Object.defineProperty(clone, 'scrollWidth', { value: 133.7, configurable: true });

    const rect = new DOMRect(0, 0, 100, 30);
    const result = widenForTruncation(target, clone, rect);

    expect(result.width).toBe(134);

    target.remove();
  });

  it('should restore clone visibility after measurement', () => {
    const target = document.createElement('span');
    target.classList.add('eui-textTruncate');
    document.body.appendChild(target);

    const clone = document.createElement('span');
    clone.style.visibility = 'visible';
    Object.defineProperty(clone, 'scrollWidth', { value: 150, configurable: true });

    const rect = new DOMRect(0, 0, 100, 30);
    widenForTruncation(target, clone, rect);

    expect(clone.style.visibility).toBe('visible');
    expect(clone.parentElement).toBeNull();

    target.remove();
  });
});

describe('copyStylesDeep', () => {
  it('should pin child dimensions but not root', () => {
    const original = document.createElement('div');
    const child = document.createElement('span');
    child.textContent = 'x';
    original.appendChild(child);
    document.body.appendChild(original);

    const clone = original.cloneNode(true) as HTMLElement;
    child.getBoundingClientRect = () => mockRect(0, 0, 80, 20);

    copyStylesDeep(original, clone);

    // Root should NOT have pinned dimensions
    expect(clone.style.width).toBe('');
    // Child should have pinned dimensions
    const clonedChild = clone.querySelector('span')!;
    expect(clonedChild.style.width).toBe('80px');
    expect(clonedChild.style.height).toBe('20px');

    original.remove();
  });
});
