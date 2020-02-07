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
import { mockReactDomRender, mockReactDomUnmount } from '../overlay.test.mocks';

import { mount } from 'enzyme';
import { i18nServiceMock } from '../../i18n/i18n_service.mock';
import { FlyoutService, OverlayFlyoutStart } from './flyout_service';
import { OverlayRef } from '../types';

const i18nMock = i18nServiceMock.createStartContract();

beforeEach(() => {
  mockReactDomRender.mockClear();
  mockReactDomUnmount.mockClear();
});

const mountText = (text: string) => (container: HTMLElement) => {
  const content = document.createElement('span');
  content.textContent = text;
  container.append(content);
  return () => {};
};

const getServiceStart = () => {
  const service = new FlyoutService();
  return service.start({ i18n: i18nMock, targetDomElement: document.createElement('div') });
};

describe('FlyoutService', () => {
  let flyouts: OverlayFlyoutStart;
  beforeEach(() => {
    flyouts = getServiceStart();
  });

  describe('openFlyout()', () => {
    it('renders a flyout to the DOM', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      flyouts.open(mountText('Flyout content'));
      expect(mockReactDomRender.mock.calls).toMatchSnapshot();
      const modalContent = mount(mockReactDomRender.mock.calls[0][0]);
      expect(modalContent.html()).toMatchSnapshot();
    });
    describe('with a currently active flyout', () => {
      let ref1: OverlayRef;
      beforeEach(() => {
        ref1 = flyouts.open(mountText('Flyout content'));
      });
      it('replaces the current flyout with a new one', () => {
        flyouts.open(mountText('Flyout content 2'));
        expect(mockReactDomRender.mock.calls).toMatchSnapshot();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
        const modalContent = mount(mockReactDomRender.mock.calls[1][0]);
        expect(modalContent.html()).toMatchSnapshot();
        expect(() => ref1.close()).not.toThrowError();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });
      it('resolves onClose on the previous ref', async () => {
        const onCloseComplete = jest.fn();
        ref1.onClose.then(onCloseComplete);
        flyouts.open(mountText('Flyout content 2'));
        await ref1.onClose;
        expect(onCloseComplete).toBeCalledTimes(1);
      });
    });
  });
  describe('FlyoutRef#close()', () => {
    it('resolves the onClose Promise', async () => {
      const ref = flyouts.open(mountText('Flyout content'));

      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);
      await ref.close();
      await ref.close();
      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });
    it('can be called multiple times on the same FlyoutRef', async () => {
      const ref = flyouts.open(mountText('Flyout content'));
      expect(mockReactDomUnmount).not.toHaveBeenCalled();
      await ref.close();
      expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
      await ref.close();
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });
    it("on a stale FlyoutRef doesn't affect the active flyout", async () => {
      const ref1 = flyouts.open(mountText('Flyout content 1'));
      const ref2 = flyouts.open(mountText('Flyout content 2'));
      const onCloseComplete = jest.fn();
      ref2.onClose.then(onCloseComplete);
      mockReactDomUnmount.mockClear();
      await ref1.close();
      expect(mockReactDomUnmount).toBeCalledTimes(0);
      expect(onCloseComplete).toBeCalledTimes(0);
    });
  });
});
