/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, render, shallow } from 'enzyme';
import { ReactElement, ReactNode } from 'react';

import { deduplicateToasts, TitleWithBadge, ToastWithRichTitle } from './deduplicate_toasts';
import { Toast } from '@kbn/core-notifications-browser';

function toast(title: string, text: string, id = Math.random()): Toast {
  return {
    id: id.toString(),
    title,
    text,
  };
}

describe('deduplicate toasts', () => {
  it('returns an empty list for an empty input', () => {
    const toasts: Toast[] = [];

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(0);
  });

  it(`doesn't affect singular notifications`, () => {
    const toasts: Toast[] = [
      toast('A', 'B'), // single toast
      toast('X', 'Y'), // single toast
    ];

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(toasts.length);
    verifyTextAndTitle(deduplicatedToastList[0], 'A', 'B');
    verifyTextAndTitle(deduplicatedToastList[1], 'X', 'Y');
  });

  it('groups toasts based on title + name', () => {
    const toasts: Toast[] = [
      toast('A', 'B'), // 2 of these
      toast('X', 'Y'), // 3 of these
      toast('A', 'B'),
      toast('X', 'Y'),
      toast('A', 'C'), // 1 of these
      toast('X', 'Y'),
    ];

    const { toasts: deduplicatedToastList } = deduplicateToasts(toasts);

    expect(deduplicatedToastList).toHaveLength(3);
    verifyTextAndTitle(deduplicatedToastList[0], 'A 2', 'B');
    verifyTextAndTitle(deduplicatedToastList[1], 'X 3', 'Y');
    verifyTextAndTitle(deduplicatedToastList[2], 'A', 'C');
  });
});

describe('TitleWithBadge component', () => {
  it('renders with string titles', () => {
    const title = 'Welcome!';

    const titleComponent = <TitleWithBadge title={title} counter={5} />;
    const shallowRender = shallow(titleComponent);
    const fullRender = mount(titleComponent);

    expect(fullRender.text()).toBe('Welcome! 5');
    expect(shallowRender).toMatchSnapshot();
  });

  it('renders with MountPoint titles', () => {
    const title = (element: HTMLElement) => {
      const a = document.createElement('a');
      a.innerHTML = 'Click me!';
      a.href = 'https://elastic.co';
      element.appendChild(a);
      return () => element.removeChild(a);
    };

    const titleComponent = <TitleWithBadge title={title} counter={7} />;
    const shallowWrapper = shallow(titleComponent);
    const fullWrapper = mount(titleComponent);
    // ^ We need the full mount, because enzyme's shallow doesn't run effects

    expect(fullWrapper.text()).toBe('Click me! 7');
    expect(shallowWrapper).toMatchSnapshot();
  });

  it('renders with ReactNode titles', () => {
    const title = <a href="https://elastic.co">Click me!</a>;

    const titleComponent = <TitleWithBadge title={title} counter={9} />;
    const shallowRender = shallow(titleComponent);
    const fullRender = mount(titleComponent);

    expect(fullRender.text()).toBe('Click me! 9');
    expect(shallowRender).toMatchSnapshot();
  });
});

function verifyTextAndTitle(
  { text, title }: ToastWithRichTitle,
  expectedTitle: string,
  expectedText: string
) {
  expect(getNodeText(title)).toBe(expectedTitle);
  expect(text).toBe(expectedText);
}

function getNodeText(node: ReactNode) {
  const rendered = render(node as ReactElement);
  return rendered.text();
}
