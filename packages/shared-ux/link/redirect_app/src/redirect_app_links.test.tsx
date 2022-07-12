/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { MouseEvent } from 'react';
import { mount as enzymeMount, ReactWrapper } from 'enzyme';
import { Observable } from 'rxjs';

import { RedirectAppLinksKibanaProvider, RedirectAppLinksProvider } from './services';
import { RedirectAppLinks } from './redirect_app_links';
import { RedirectAppLinks as ComposedWrapper } from '.';
import { getRedirectAppLinksMockServices as getMockServices } from './jest';

export type UnmountCallback = () => void;
export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;

type Mount = (
  node: React.ReactElement
) => ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>;

const services = getMockServices();
const { navigateToUrl } = services;

const commonTests = (name: string, mount: Mount) => {
  beforeEach(() => {
    navigateToUrl.mockReset();
  });

  describe(`RedirectAppLinks with ${name}`, () => {
    it('intercept click events on children link elements', () => {
      let event: MouseEvent;
      const component = mount(
        <div
          onClick={(e) => {
            event = e;
          }}
        >
          <RedirectAppLinks>
            <div>
              <a href="/mocked-anyway">content</a>
            </div>
          </RedirectAppLinks>
        </div>
      );

      component.find('a').simulate('click', { button: 0, defaultPrevented: false });
      expect(navigateToUrl).toHaveBeenCalledTimes(1);
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
          <RedirectAppLinks>
            <div>
              <a href="/mocked-anyway">
                <span>content</span>
              </a>
            </div>
          </RedirectAppLinks>
        </div>
      );

      component.find('span').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).toHaveBeenCalledTimes(1);
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
          <RedirectAppLinks>
            <span>
              <a href="/mocked-anyway">content</a>
            </span>
          </RedirectAppLinks>
        </div>
      );

      component.find('span').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
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
          <RedirectAppLinks>
            <a href="/mocked-anyway" target="_blank">
              content
            </a>
          </RedirectAppLinks>
        </div>
      );

      component.find('a').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
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
          <RedirectAppLinks>
            <a href="/mocked-anyway" target="_blank">
              <span onClick={(e) => e.preventDefault()}>content</span>
            </a>
          </RedirectAppLinks>
        </div>
      );

      component.find('span').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
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
          <RedirectAppLinks>
            <a href="/mocked-anyway" target="_blank" onClick={(e) => e.stopPropagation()}>
              content
            </a>
          </RedirectAppLinks>
        </div>
      );

      component.find('a').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
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
          <RedirectAppLinks>
            <div>
              <a href="/mocked-anyway">content</a>
            </div>
          </RedirectAppLinks>
        </div>
      );

      component.find('a').simulate('click', { button: 1, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
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
          <RedirectAppLinks>
            <div>
              <a href="/mocked-anyway">content</a>
            </div>
          </RedirectAppLinks>
        </div>
      );

      component.find('a').simulate('click', { button: 0, ctrlKey: true, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
      expect(event!.defaultPrevented).toBe(false);
    });
  });
};

const targetedTests = (name: string, mount: Mount) => {
  beforeEach(() => {
    navigateToUrl.mockReset();
  });

  describe(`${name} with isolated areas of effect`, () => {
    it(`does not intercept click events when the link is a parent of the container`, () => {
      let event: MouseEvent;

      const component = mount(
        <div
          onClick={(e) => {
            event = e;
          }}
        >
          <a href="/mocked-anyway">
            <RedirectAppLinks>
              <span>content</span>
            </RedirectAppLinks>
          </a>
        </div>
      );

      component.find('span').simulate('click', { button: 0, defaultPrevented: false });

      expect(navigateToUrl).not.toHaveBeenCalled();
      expect(event!.defaultPrevented).toBe(false);
    });
  });
};

describe('RedirectAppLinks', () => {
  beforeEach(() => {
    navigateToUrl.mockReset();
  });

  const kibana = {
    coreStart: {
      application: {
        currentAppId$: new Observable<string>((subscriber) => {
          subscriber.next('123');
        }),
        navigateToUrl,
      },
    },
  };

  const provider = (node: React.ReactElement) =>
    enzymeMount(<RedirectAppLinksProvider {...services}>{node}</RedirectAppLinksProvider>);

  const kibanaProvider = (node: React.ReactElement) =>
    enzymeMount(
      <RedirectAppLinksKibanaProvider {...kibana}>{node}</RedirectAppLinksKibanaProvider>
    );

  const composedProvider = (node: React.ReactElement) =>
    enzymeMount(<ComposedWrapper {...services}>{node}</ComposedWrapper>);

  const composedKibanaProvider = (node: React.ReactElement) =>
    enzymeMount(<ComposedWrapper {...kibana}>{node}</ComposedWrapper>);

  describe('Test all Providers', () => {
    commonTests('RedirectAppLinksProvider', provider);
    targetedTests('RedirectAppLinksProvider', provider);
    commonTests('RedirectAppLinksKibanaProvider', kibanaProvider);
    targetedTests('RedirectAppLinksKibanaProvider', kibanaProvider);
    commonTests('Provider Props', composedProvider);
    commonTests('Kibana Props', composedKibanaProvider);
  });
});
