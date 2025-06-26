/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MouseEvent } from 'react';
import { navigateToUrlClickHandler } from './click_handler';

const createLink = ({
  href = '/base-path/app/targetApp',
  target = '',
}: { href?: string; target?: string } = {}): HTMLAnchorElement => {
  const el = document.createElement('a');
  if (href) {
    el.href = href;
  }
  el.target = target;
  return el;
};

const createEvent = ({
  target = createLink(),
  button = 0,
  defaultPrevented = false,
  modifierKey = false,
}: {
  target?: HTMLElement;
  button?: number;
  defaultPrevented?: boolean;
  modifierKey?: boolean;
}): MouseEvent<HTMLElement> => {
  return {
    target,
    button,
    defaultPrevented,
    ctrlKey: modifierKey,
    preventDefault: jest.fn(),
  } as unknown as MouseEvent<HTMLElement>;
};

type NavigateToURLFn = (url: string) => Promise<void>;

describe('navigateToUrlClickHandler', () => {
  let container: HTMLElement;
  let navigateToUrl: jest.MockedFunction<NavigateToURLFn>;
  const currentAppId = 'abc123';

  const handler = (event: MouseEvent<HTMLElement>): void => {
    navigateToUrlClickHandler({
      event,
      currentAppId,
      container,
      navigateToUrl,
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    navigateToUrl = jest.fn();
  });

  it("doesn't call `navigateToUrl` without a container", () => {
    const event = createEvent({
      target: createLink({ href: '/base-path/app/targetApp' }),
    });

    navigateToUrlClickHandler({
      event,
      currentAppId,
      container: null,
      navigateToUrl,
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(0);
  });

  it("doesn't call `navigateToUrl` without a `currentAppId`", () => {
    const event = createEvent({
      target: createLink({ href: '/base-path/app/targetApp' }),
    });

    navigateToUrlClickHandler({
      event,
      container,
      navigateToUrl,
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(0);
  });

  it('calls `navigateToUrl` with the link url', () => {
    const event = createEvent({
      target: createLink({ href: '/base-path/app/targetApp' }),
    });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledWith('http://localhost/base-path/app/targetApp');
  });

  it('is triggered if a non-link target has a parent link', () => {
    const link = createLink();
    const target = document.createElement('span');
    link.appendChild(target);

    const event = createEvent({ target });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledWith('http://localhost/base-path/app/targetApp');
  });

  it('is not triggered if a non-link target has no parent link', () => {
    const parent = document.createElement('div');
    const target = document.createElement('span');
    parent.appendChild(target);

    const event = createEvent({ target });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it('is not triggered when the link has no href', () => {
    const event = createEvent({
      target: createLink({ href: '' }),
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();
  });

  it('is only triggered when the link does not have an external target', () => {
    let event = createEvent({
      target: createLink({ target: '_blank' }),
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({
      target: createLink({ target: 'some-target' }),
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({
      target: createLink({ target: '_self' }),
    });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledTimes(1);

    event = createEvent({
      target: createLink({ target: '' }),
    });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledTimes(2);
  });

  it('is only triggered from left clicks', () => {
    let event = createEvent({
      button: 1,
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({
      button: 12,
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({
      button: 0,
    });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledTimes(1);
  });

  it('is not triggered if the event default is prevented', () => {
    let event = createEvent({
      defaultPrevented: true,
    });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({
      defaultPrevented: false,
    });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledTimes(1);
  });

  it('is not triggered if any modifier key is pressed', () => {
    let event = createEvent({ modifierKey: true });

    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToUrl).not.toHaveBeenCalled();

    event = createEvent({ modifierKey: false });

    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToUrl).toHaveBeenCalledTimes(1);
  });
});
