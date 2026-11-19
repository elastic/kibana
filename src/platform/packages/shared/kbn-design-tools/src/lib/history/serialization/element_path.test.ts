/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toPath, fromPath } from './element_path';

describe('element_path', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('toPath', () => {
    it('should build a selector that uniquely identifies the element', () => {
      const div = document.createElement('div');
      const p = document.createElement('p');
      div.appendChild(p);
      document.body.appendChild(div);

      const path = toPath(p);
      expect(path.selector).toContain('p:nth-child(1)');
      expect(path.fingerprint).toContain('P|');
    });

    it('should include nth-child for siblings', () => {
      const parent = document.createElement('div');
      const first = document.createElement('span');
      const second = document.createElement('span');
      parent.appendChild(first);
      parent.appendChild(second);
      document.body.appendChild(parent);

      const path1 = toPath(first);
      const path2 = toPath(second);
      expect(path1.selector).toContain('span:nth-child(1)');
      expect(path2.selector).toContain('span:nth-child(2)');
    });

    it('should capture text content in fingerprint', () => {
      const el = document.createElement('div');
      el.textContent = 'Hello world';
      document.body.appendChild(el);

      const path = toPath(el);
      expect(path.fingerprint).toContain('Hello world');
    });

    it('should not include descendant text in fingerprint', () => {
      const parent = document.createElement('div');
      parent.appendChild(document.createTextNode('Direct '));
      const child = document.createElement('span');
      child.textContent = 'nested counter: 42';
      parent.appendChild(child);
      document.body.appendChild(parent);

      const path = toPath(parent);
      expect(path.fingerprint).toContain('Direct');
      expect(path.fingerprint).not.toContain('42');
    });

    it('should include child count in fingerprint for structural stability', () => {
      const parent = document.createElement('div');
      parent.appendChild(document.createElement('span'));
      parent.appendChild(document.createElement('span'));
      document.body.appendChild(parent);

      const path = toPath(parent);
      expect(path.fingerprint).toContain('|2|');
    });
  });

  describe('fromPath', () => {
    it('should resolve a path back to the same element', () => {
      const div = document.createElement('div');
      div.textContent = 'test content';
      document.body.appendChild(div);

      const path = toPath(div);
      const result = fromPath(path);
      expect(result.element).toBe(div);
      expect(result.fingerprintMatch).toBe(true);
    });

    it('should return null for non-existent selector', () => {
      const result = fromPath({
        selector: 'body > div:nth-child(999)',
        fingerprint: 'DIV|abc|text',
      });
      expect(result.element).toBeNull();
      expect(result.fingerprintMatch).toBe(false);
    });

    it('should detect fingerprint mismatch when content changes', () => {
      const el = document.createElement('div');
      el.textContent = 'original';
      document.body.appendChild(el);

      const path = toPath(el);
      el.textContent = 'changed';

      const result = fromPath(path);
      expect(result.element).toBe(el);
      expect(result.fingerprintMatch).toBe(false);
    });

    it('should roundtrip through nested structures', () => {
      const outer = document.createElement('div');
      const inner = document.createElement('section');
      const target = document.createElement('p');
      target.textContent = 'target';
      inner.appendChild(target);
      outer.appendChild(inner);
      document.body.appendChild(outer);

      const path = toPath(target);
      const result = fromPath(path);
      expect(result.element).toBe(target);
      expect(result.fingerprintMatch).toBe(true);
    });
  });
});
