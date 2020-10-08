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

import React, { MouseEvent } from 'react';
import { mount } from 'enzyme';
import { applicationServiceMock } from '../../../../core/public/mocks';
import { RedirectAppLinks } from './redirect_app_link';
import { BehaviorSubject } from 'rxjs';

/* eslint-disable jsx-a11y/click-events-have-key-events */

describe('RedirectAppLinks', () => {
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  beforeEach(() => {
    application = applicationServiceMock.createStartContract();
    application.currentAppId$ = new BehaviorSubject<string>('currentApp');
  });

  it('intercept click events on children link elements', () => {
    let event: MouseEvent;

    const component = mount(
      <div
        onClick={(e) => {
          event = e;
        }}
      >
        <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
          <a href="/mocked-anyway">
            <span>content</span>
          </a>
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
        <RedirectAppLinks application={application}>
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
          <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
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
        <RedirectAppLinks application={application}>
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
