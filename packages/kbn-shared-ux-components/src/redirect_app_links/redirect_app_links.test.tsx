/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { MouseEvent } from 'react';
import { mount } from 'enzyme';
import { BehaviorSubject } from 'rxjs';

import { RedirectAppLinks } from './redirect_app_links';

export type UnmountCallback = () => void;
export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;

const createServiceMock = () => {
  const currentAppId$ = new BehaviorSubject<string>('currentApp');

  return {
    currentAppId$: currentAppId$.asObservable(),
    navigateToApp: jest.fn(),
    navigateToUrl: jest.fn(),
  };
};

/* eslint-disable jsx-a11y/click-events-have-key-events */

describe('RedirectAppLinks', () => {
  let application = createServiceMock();

  beforeEach(() => {
    application = createServiceMock();
  });

  it('intercept click events on children link elements', () => {
    let event: MouseEvent;
    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks
          navigateToUrl={application.navigateToUrl}
          currentAppId$={application.currentAppId$}
        >
          <div>
            <a href="/mocked-anyway">content</a>
          </div>
        </RedirectAppLinks>
      </div>
    );

    component.find('a').simulate('click', { button: 0, defaultPrevented: false });
    expect(application.navigateToUrl).toHaveBeenCalledTimes(1);
    expect(event!.defaultPrevented).toBe(true);
  });

  it('intercept click events on children inside link elements', async () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks
          navigateToUrl={application.navigateToUrl}
          currentAppId$={application.currentAppId$}
        >
          <div>
            <a href="/mocked-anyway">
              <span>content</span>
            </a>
          </div>
        </RedirectAppLinks>
      </div>
    );

    component.find('span').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToUrl).toHaveBeenCalledTimes(1);
    expect(event!.defaultPrevented).toBe(true);
  });

  it('does not intercept click events when the target is not inside a link', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <span>
            <a href="/mocked-anyway">content</a>
          </span>
        </RedirectAppLinks>
      </div>
    );

    component.find('span').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(false);
  });

  it('does not intercept click events when the link is a parent of the container', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <a href="/mocked-anyway">
          <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
            <span>content</span>
          </RedirectAppLinks>
        </a>
      </div>
    );

    component.find('span').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(false);
  });

  it('does not intercept click events when the link has an external target', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <a href="/mocked-anyway" target="_blank">
            content
          </a>
        </RedirectAppLinks>
      </div>
    );

    component.find('a').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(false);
  });

  it('does not intercept click events when the event is already defaultPrevented', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <a href="/mocked-anyway" target="_blank">
            <span onClick={(e) => e.preventDefault()}>content</span>
          </a>
        </RedirectAppLinks>
      </div>
    );

    component.find('span').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(true);
  });

  it('does not intercept click events when the event propagation is stopped', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <a href="/mocked-anyway" target="_blank" onClick={(e) => e.stopPropagation()}>
            content
          </a>
        </RedirectAppLinks>
      </div>
    );

    component.find('a').simulate('click', { button: 0, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!).toBe(undefined);
  });

  it('does not intercept click events when the event is not triggered from the left button', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <div>
            <a href="/mocked-anyway">content</a>
          </div>
        </RedirectAppLinks>
      </div>
    );

    component.find('a').simulate('click', { button: 1, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(false);
  });

  it('does not intercept click events when the event has a modifier key enabled', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks navigateToUrl={jest.fn()} currentAppId$={application.currentAppId$}>
          <div>
            <a href="/mocked-anyway">content</a>
          </div>
        </RedirectAppLinks>
      </div>
    );

    component.find('a').simulate('click', { button: 0, ctrlKey: true, defaultPrevented: false });

    expect(application.navigateToApp).not.toHaveBeenCalled();
    expect(event!.defaultPrevented).toBe(false);
  });
});
