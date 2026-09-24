/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { drawScrolledFields, preserveScroll } from './capture_viewport';

/**
 * What the library does with a node: a shallow clone, the children cloned into
 * it, the `after` adjustment, then the styles copied and a field's value put in
 * (as the textarea's content, and as the input's `value` attribute).
 */
const cloneLikeTheLibrary = (original: Element): HTMLElement => {
  const clone = original.cloneNode(false) as HTMLElement;
  Array.from(original.childNodes).forEach((child) => {
    clone.append(child instanceof Element ? cloneLikeTheLibrary(child) : child.cloneNode(false));
  });
  preserveScroll(original, clone, true);
  if (original instanceof HTMLTextAreaElement) {
    clone.textContent = original.value;
  } else if (original instanceof HTMLInputElement) {
    clone.setAttribute('value', original.value);
  }
  return clone;
};

const parse = (html: string): HTMLElement =>
  new DOMParser().parseFromString(html, 'text/html').body.firstElementChild as HTMLElement;

describe('captureViewport', () => {
  describe('preserveScroll', () => {
    it('shifts the children of a scrolled container by its offset and clips them, keeping their own transforms', () => {
      const original = parse(
        `<div><p>One</p><p style="transform: rotate(1deg)">Two</p><svg></svg></div>`
      );
      original.scrollTop = 40;
      original.scrollLeft = 5;

      const clone = cloneLikeTheLibrary(original);

      expect(clone.style.overflowX).toBe('hidden');
      expect(clone.style.overflowY).toBe('hidden');
      const [one, two, svg] = Array.from(clone.children) as (HTMLElement | SVGElement)[];
      expect(one.style.transform).toBe('translate(-5px, -40px)');
      expect(two.style.transform).toBe('translate(-5px, -40px) rotate(1deg)');
      expect(svg.style.transform).toBe('translate(-5px, -40px)');
    });

    it('shifts text of the container itself, which a transform would leave in place', () => {
      const original = parse(`<div>A long line of text that overflows <b>with</b> markup</div>`);
      original.scrollLeft = 30;

      const clone = cloneLikeTheLibrary(original);

      expect(clone.textContent).toBe('A long line of text that overflows with markup');
      const [text, markup, rest] = Array.from(clone.childNodes) as HTMLElement[];
      for (const wrapper of [text, rest]) {
        expect(wrapper.tagName).toBe('SPAN');
        expect(wrapper.style.position).toBe('relative');
        expect(wrapper.style.left).toBe('-30px');
        expect(wrapper.style.top).toBe('0px');
      }
      expect(markup.tagName).toBe('B');
      expect(markup.style.transform).toBe('translate(-30px, 0px)');
    });

    it('leaves an unscrolled container as it is', () => {
      const clone = cloneLikeTheLibrary(parse(`<div>Text <p>and a paragraph</p></div>`));

      expect(clone.outerHTML).toBe('<div>Text <p>and a paragraph</p></div>');
    });
  });

  describe('drawScrolledFields', () => {
    it('draws a scrolled textarea as a box of the same styles with its value shifted in it', () => {
      const original = parse(
        `<div><textarea style="width: 200px; padding: 8px; white-space: pre-wrap"></textarea></div>`
      );
      const textarea = original.querySelector('textarea')!;
      textarea.value = 'first line\nsecond line\nthird line';
      textarea.scrollTop = 40;

      const root = cloneLikeTheLibrary(original);
      drawScrolledFields(root);

      expect(root.querySelector('textarea')).toBeNull();
      const box = root.firstElementChild as HTMLElement;
      expect(box.tagName).toBe('DIV');
      expect(box.style.width).toBe('200px');
      expect(box.style.padding).toBe('8px');
      expect(box.style.whiteSpace).toBe('pre-wrap');
      expect(box.style.overflow).toBe('hidden');
      const value = box.firstElementChild as HTMLElement;
      expect(value.textContent).toBe('first line\nsecond line\nthird line');
      expect(value.style.transform).toBe('translate(0px, -40px)');
    });

    it('draws a text input scrolled to the end of its value the same way, and no other field', () => {
      const original = parse(
        `<form><input type="text" style="width: 80px" /><input type="text" /><input type="password" /></form>`
      );
      const [scrolled, unscrolled, password] = Array.from(
        original.querySelectorAll('input')
      ) as HTMLInputElement[];
      scrolled.value = 'a value longer than the field';
      scrolled.scrollLeft = 120;
      unscrolled.value = 'short';
      password.value = 'secret';
      password.scrollLeft = 120;

      const root = cloneLikeTheLibrary(original);
      drawScrolledFields(root);

      const [box, ...inputs] = Array.from(root.children) as HTMLElement[];
      expect(box.tagName).toBe('DIV');
      expect(box.style.width).toBe('80px');
      const value = box.firstElementChild as HTMLElement;
      expect(value.textContent).toBe('a value longer than the field');
      expect(value.style.transform).toBe('translate(-120px, 0px)');
      // The unscrolled one as the library leaves it; a password never as text.
      expect(inputs.map((input) => input.tagName)).toEqual(['INPUT', 'INPUT']);
      expect(inputs[0].outerHTML).toBe('<input type="text" value="short">');
      expect(root.textContent).not.toContain('secret');
    });
  });
});
