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

import { parseAppUrlMock, isModifiedEventMock } from './delegated_handlers.test.mocks';

import { ApplicationStart, App, LegacyApp } from './types';
import {
  createCrossAppLinkClickHandler,
  DelegatedClickEvent,
  disableCoreNavAttribute,
} from './delegated_handlers';
import { IBasePath } from '../http';
import { httpServiceMock } from '../http/http_service.mock';

const createElement = ({
  href = '/base-path/app/targetApp',
  target = '',
  disableCoreNav = false,
}: { href?: string; target?: string; disableCoreNav?: boolean } = {}): HTMLAnchorElement => {
  const el = document.createElement('a');
  el.href = href;
  el.target = target;
  if (disableCoreNav) {
    el.setAttribute(disableCoreNavAttribute, 'true');
  }
  return el;
};

const createEvent = ({
  target = createElement(),
  button = 0,
  defaultPrevented = false,
}: {
  target?: HTMLAnchorElement;
  button?: number;
  defaultPrevented?: boolean;
}): DelegatedClickEvent => {
  return ({
    currentTarget: target,
    button,
    defaultPrevented,
    preventDefault: jest.fn(),
  } as unknown) as DelegatedClickEvent;
};

describe('Cross App Delegated Click Handler', () => {
  let navigateToApp: jest.MockedFunction<ApplicationStart['navigateToApp']>;
  let basePath: IBasePath;
  let getCurrentAppId: jest.MockedFunction<() => string | undefined>;
  let apps: Map<string, App<any> | LegacyApp>;

  const createHandler = () =>
    createCrossAppLinkClickHandler({
      navigateToApp,
      basePath,
      apps,
      getCurrentAppId,
    });

  beforeEach(() => {
    navigateToApp = jest.fn();
    basePath = httpServiceMock.createSetupContract().basePath;
    getCurrentAppId = jest.fn().mockReturnValue('currentApp');
    apps = new Map();
    parseAppUrlMock.mockReturnValue({ app: 'targetApp' });
    isModifiedEventMock.mockReturnValue(false);
  });

  it('calls `navigateToApp` when the target is a valid link to a cross app', () => {
    parseAppUrlMock.mockReturnValue({ app: 'targetApp', path: '/foo' });
    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledWith('targetApp', { path: '/foo' });
  });

  it('is not triggered when the link is not parseable', () => {
    parseAppUrlMock.mockReturnValue(undefined);
    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is not triggered when the link points to the current app', () => {
    parseAppUrlMock.mockReturnValue({ app: 'targetApp', path: '/foo' });
    getCurrentAppId.mockReturnValue('targetApp');

    const handler = createHandler();

    const event = createEvent({});
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('is only triggered when the link does not have an external target', () => {
    const handler = createHandler();

    let event = createEvent({
      target: createElement({ target: '_blank' }),
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      target: createElement({ target: 'some-target' }),
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    event = createEvent({
      target: createElement({ target: 'self' }),
    });
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);

    event = createEvent({
      target: createElement({ target: '' }),
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

    isModifiedEventMock.mockReturnValue(true);
    let event = createEvent({});
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    isModifiedEventMock.mockReturnValue(false);
    event = createEvent({});
    handler(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigateToApp).toHaveBeenCalledTimes(1);
  });

  it('is not triggered if navigation is disabled using data-disable-core-navigation ', () => {
    const handler = createHandler();

    let event = createEvent({
      target: createElement({ disableCoreNav: true }),
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();

    const link = createElement({ disableCoreNav: true });
    const parent = document.createElement('div');
    parent.appendChild(link);
    parent.setAttribute(disableCoreNavAttribute, 'true');
    event = createEvent({
      target: link,
    });
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigateToApp).not.toHaveBeenCalled();
  });
});
