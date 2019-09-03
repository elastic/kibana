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
import { mockReactDomRender, mockReactDomUnmount } from './flyout.test.mocks';

import React from 'react';
import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { FlyoutRef, FlyoutService } from './flyout';

const i18nMock = i18nServiceMock.createStartContract();

beforeEach(() => {
  mockReactDomRender.mockClear();
  mockReactDomUnmount.mockClear();
});

describe('FlyoutService', () => {
  describe('openFlyout()', () => {
    it('renders a flyout to the DOM', () => {
      const target = document.createElement('div');
      const flyoutService = new FlyoutService(target);
      expect(mockReactDomRender).not.toHaveBeenCalled();
      flyoutService.openFlyout(i18nMock, <span>Flyout content</span>);
      expect(mockReactDomRender.mock.calls).toMatchSnapshot();
    });
    describe('with a currently active flyout', () => {
      let target: HTMLElement, flyoutService: FlyoutService, ref1: FlyoutRef;
      beforeEach(() => {
        target = document.createElement('div');
        flyoutService = new FlyoutService(target);
        ref1 = flyoutService.openFlyout(i18nMock, <span>Flyout content 1</span>);
      });
      it('replaces the current flyout with a new one', () => {
        flyoutService.openFlyout(i18nMock, <span>Flyout content 2</span>);
        expect(mockReactDomRender.mock.calls).toMatchSnapshot();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
        expect(() => ref1.close()).not.toThrowError();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });
      it('resolves onClose on the previous ref', async () => {
        const onCloseComplete = jest.fn();
        ref1.onClose.then(onCloseComplete);
        flyoutService.openFlyout(i18nMock, <span>Flyout content 2</span>);
        await ref1.onClose;
        expect(onCloseComplete).toBeCalledTimes(1);
      });
    });
  });
  describe('FlyoutRef#close()', () => {
    it('resolves the onClose Promise', async () => {
      const target = document.createElement('div');
      const flyoutService = new FlyoutService(target);
      const ref = flyoutService.openFlyout(i18nMock, <span>Flyout content</span>);

      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);
      await ref.close();
      await ref.close();
      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });
    it('can be called multiple times on the same FlyoutRef', async () => {
      const target = document.createElement('div');
      const flyoutService = new FlyoutService(target);
      const ref = flyoutService.openFlyout(i18nMock, <span>Flyout content</span>);
      expect(mockReactDomUnmount).not.toHaveBeenCalled();
      await ref.close();
      expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
      await ref.close();
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });
    it("on a stale FlyoutRef doesn't affect the active flyout", async () => {
      const target = document.createElement('div');
      const flyoutService = new FlyoutService(target);
      const ref1 = flyoutService.openFlyout(i18nMock, <span>Flyout content 1</span>);
      const ref2 = flyoutService.openFlyout(i18nMock, <span>Flyout content 2</span>);
      const onCloseComplete = jest.fn();
      ref2.onClose.then(onCloseComplete);
      mockReactDomUnmount.mockClear();
      await ref1.close();
      expect(mockReactDomUnmount).toBeCalledTimes(0);
      expect(onCloseComplete).toBeCalledTimes(0);
    });
  });
});
