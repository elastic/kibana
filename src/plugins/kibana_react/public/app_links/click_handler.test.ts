/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { MouseEvent } from 'react';
import { ApplicationStart } from 'src/core/public';
import { createCrossAppClickHandler } from './click_handler';

const createLink = ({
  href = '/base-path/app/targetApp',
  target = '',
}: { href?: string; target?: string } = {}): HTMLAnchorElement => {
  const el = document.createElement('a');
  el.href = href;
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
  return ({
    target,
    button,
    defaultPrevented,
    ctrlKey: modifierKey,
    preventDefault: jest.fn(),
  } as unknown) as MouseEvent<HTMLElement>;
};

describe('createCrossAppClickHandler', () => {
  let container: HTMLElement;
  let navigateToApp: jest.MockedFunction<ApplicationStart['navigateToApp']>;
  let parseAppUrl: jest.MockedFunction<ApplicationStart['parseAppUrl']>;
  let currentAppId: string;

  const createHandler = () =>
    createCrossAppClickHandler({
      container,
      currentAppId,
      navigateToApp,
      parseAppUrl,
    });

  beforeEach(() => {
    container = document.createElement('div');
    navigateToApp = jest.fn();
    parseAppUrl = jest.fn().mockReturnValue({ app: 'targetApp' });
    currentAppId = 'currentApp';
  });

  it('calls `navigateToApp` when the target is a valid link to a cross app', () => {
    parseAppUrl.mockReturnValue({ app: 'targetApp', path: '/foo' });
    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledWith('targetApp', { path: '/foo' });
  });

  it('is triggered if a non-link target has a parent link', () => {
    parseAppUrl.mockReturnValue({ app: 'targetApp', path: '/foo' });
    const handler = createHandler();

    const link = createLink();
    const target = document.createElement('span');
    link.appendChild(target);

    const event = createEvent({ target });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledWith('targetApp', { path: '/foo' });
  });

  it('is not triggered if a non-link target has no parent link', () => {
    parseAppUrl.mockReturnValue({ app: 'targetApp', path: '/foo' });
    const handler = createHandler();

    const parent = document.createElement('div');
    const target = document.createElement('span');
    parent.appendChild(target);

    const event = createEvent({ target });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is not triggered when the link is not parseable', () => {
    parseAppUrl.mockReturnValue(undefined);
    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is not triggered when the link points to the current app', () => {
    parseAppUrl.mockReturnValue({ app: 'targetApp', path: '/foo' });
    currentAppId = 'targetApp';

    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is only triggered when the link does not have an external target', () => {
    const handler = createHandler();

    let event = createEvent({
      target: createLink({ target: '_blank' }),
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      target: createLink({ target: 'some-target' }),
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      target: createLink({ target: '_self' }),
    });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);

    event = createEvent({
      target: createLink({ target: '' }),
    });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(2);
  });

  it('is only triggered from left clicks', () => {
    const handler = createHandler();

    let event = createEvent({
      button: 1,
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      button: 12,
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      button: 0,
    });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);
  });

  it('is not triggered if the event default is prevented', () => {
    const handler = createHandler();

    let event = createEvent({
      defaultPrevented: true,
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      defaultPrevented: false,
    });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);
  });

  it('is not triggered if any modifier key is pressed', () => {
    const handler = createHandler();

    let event = createEvent({ modifierKey: true });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({ modifierKey: false });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);
  });
});
