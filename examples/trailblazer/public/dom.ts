/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type Child = Node | string | null | undefined | false;

export interface ElementProps {
  readonly className?: string | ReadonlyArray<string | false | undefined>;
  readonly text?: string;
  readonly title?: string;
  readonly attrs?: Readonly<Record<string, string>>;
}

/** Creates an element with the given class names, attributes, and children. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElementProps = {},
  children: readonly Child[] = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  const { className, text, title, attrs } = props;

  if (className) {
    element.className =
      typeof className === 'string' ? className : className.filter(Boolean).join(' ');
  }
  if (text !== undefined) element.textContent = text;
  if (title !== undefined) element.title = title;
  for (const [name, value] of Object.entries(attrs ?? {})) {
    element.setAttribute(name, value);
  }
  for (const child of children) {
    if (child) element.append(child);
  }
  return element;
}

export function button(
  label: string,
  className: string,
  onClick: (event: MouseEvent) => void,
  title?: string
): HTMLButtonElement {
  const element = h('button', { className, text: label, title, attrs: { type: 'button' } });
  if (title) element.setAttribute('aria-label', title);
  element.addEventListener('click', onClick);
  return element;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return function debounced(...args: A) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
