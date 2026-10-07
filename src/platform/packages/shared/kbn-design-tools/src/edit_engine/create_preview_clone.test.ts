/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createPreviewClone } from './create_preview_clone';
import {
  DEVTOOL_HIDDEN_ATTR,
  DEVTOOL_MANAGED_ATTR,
  DEVTOOL_CLONE_HIDDEN_ATTR,
} from '../lib/constants';
import '../lib/tests/mocks';

const mockRect = (x = 0, y = 0, w = 100, h = 50): DOMRect => new DOMRect(x, y, w, h) as DOMRect;

describe('createPreviewClone', () => {
  let target: HTMLDivElement;

  beforeEach(() => {
    target = document.createElement('div');
    target.textContent = 'content';
    target.getBoundingClientRect = () => mockRect(10, 20, 200, 100);
    document.body.appendChild(target);
  });

  afterEach(() => target.remove());

  it('should widen wrapper when child has truncation class', () => {
    const child = document.createElement('span');
    child.classList.add('eui-textTruncate');
    child.textContent = 'Stack Management';
    target.appendChild(child);

    // Mock scrollWidth on any clone that gets appended to body during measurement
    const origAppendChild = document.body.appendChild.bind(document.body);
    jest.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      const result = origAppendChild(node);
      if (node instanceof HTMLElement && node !== target) {
        Object.defineProperty(node, 'scrollWidth', { value: 250, configurable: true });
      }
      return result;
    });

    const { clone } = createPreviewClone(target);

    expect(clone.style.minWidth).toBe('250px');

    jest.restoreAllMocks();
  });

  it('should return a wrapper with the clone inside', () => {
    const { clone } = createPreviewClone(target);

    expect(clone.tagName).toBe('DIV');
    expect(clone.children).toHaveLength(1);
    expect(clone.firstElementChild!.textContent).toBe('content');
  });

  it('should have wrapper min dimensions from rounded visual rect', () => {
    const { clone } = createPreviewClone(target);

    expect(clone.style.minWidth).toMatch(/^\d+px$/);
    expect(clone.style.minHeight).toMatch(/^\d+px$/);
  });

  it('should set clone to relative positioning with zeroed offsets', () => {
    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;

    expect(inner.style.getPropertyValue('position')).toBe('relative');
    // setImportant('left', '0') → jsdom stores as '0px'
    expect(parseFloat(inner.style.getPropertyValue('left'))).toBe(0);
    expect(parseFloat(inner.style.getPropertyValue('top'))).toBe(0);
  });

  it('should build element map from original to clone', () => {
    const child = document.createElement('span');
    child.textContent = 'child';
    target.appendChild(child);

    const { elementMap } = createPreviewClone(target);

    expect(elementMap.has(target)).toBe(true);
    expect(elementMap.has(child)).toBe(true);
    expect(elementMap.get(target)).toBeInstanceOf(HTMLElement);
    expect(elementMap.get(child)).toBeInstanceOf(HTMLElement);
    // Clone and original should be different elements
    expect(elementMap.get(target)).not.toBe(target);
  });

  it('should strip devtool attributes from clone', () => {
    target.setAttribute(DEVTOOL_MANAGED_ATTR, '');

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;

    expect(inner.hasAttribute(DEVTOOL_MANAGED_ATTR)).toBe(false);
  });

  it('should keep hidden descendants invisible', () => {
    const hidden = document.createElement('span');
    hidden.setAttribute(DEVTOOL_HIDDEN_ATTR, '');
    hidden.textContent = 'deleted';
    target.appendChild(hidden);

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const clonedSpan = inner.querySelector('span')!;

    expect(clonedSpan.hasAttribute(DEVTOOL_HIDDEN_ATTR)).toBe(false);
  });

  it('should keep managed clone hidden descendants marked with data-clone-hidden hidden', () => {
    target.setAttribute(DEVTOOL_MANAGED_ATTR, '');
    const hidden = document.createElement('span');
    hidden.setAttribute(DEVTOOL_CLONE_HIDDEN_ATTR, 'true');
    hidden.style.visibility = 'hidden';
    hidden.textContent = 'deleted';
    target.appendChild(hidden);

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const clonedSpan = inner.querySelector('span')!;

    expect(clonedSpan.style.visibility).toBe('hidden');
    expect(clonedSpan.hasAttribute(DEVTOOL_CLONE_HIDDEN_ATTR)).toBe(false);
  });

  it('should strip translate from transform while keeping scale', () => {
    target.style.transform = 'translate(50px, 30px) scale(1.5)';

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const transform = inner.style.getPropertyValue('transform');

    expect(transform).not.toContain('translate');
    expect(transform).toContain('scale(1.5)');
  });

  it('should strip translate with nested parens like calc()', () => {
    target.style.transform = 'translateX(calc(100% - 10px)) scale(2)';

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const transform = inner.style.getPropertyValue('transform');

    expect(transform).not.toContain('translate');
    expect(transform).not.toContain('calc');
    expect(transform).toContain('scale(2)');
  });

  it('should strip translate3d while keeping rotate', () => {
    target.style.transform = 'translate3d(10px, 20px, 30px) rotate(45deg)';

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const transform = inner.style.getPropertyValue('transform');

    expect(transform).not.toContain('translate');
    expect(transform).toContain('rotate(45deg)');
  });

  it('should return none when transform is only translate', () => {
    target.style.transform = 'translate(50px, 30px)';

    const { clone } = createPreviewClone(target);
    const inner = clone.firstElementChild as HTMLElement;
    const transform = inner.style.getPropertyValue('transform');

    expect(transform).toBe('none');
  });
});
