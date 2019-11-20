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

import React from 'react';
import { mount } from 'enzyme';
import { i18nServiceMock } from '../../i18n/i18n_service.mock';
import { ModalService, OverlayModalStart } from './modal_service';
import { mountReactNode } from '../../utils';
import { OverlayRef } from '../types';

const i18nMock = i18nServiceMock.createStartContract();

beforeEach(() => {
  mockReactDomRender.mockClear();
  mockReactDomUnmount.mockClear();
});

const getServiceStart = () => {
  const service = new ModalService();
  return service.start({ i18n: i18nMock, targetDomElement: document.createElement('div') });
};

describe('ModalService', () => {
  let modals: OverlayModalStart;
  beforeEach(() => {
    modals = getServiceStart();
  });

  describe('openModal()', () => {
    it('renders a modal to the DOM', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      modals.open(container => {
        const content = document.createElement('span');
        content.textContent = 'Modal content';
        container.append(content);
        return () => {};
      });
      expect(mockReactDomRender.mock.calls).toMatchSnapshot();
      const modalContent = mount(mockReactDomRender.mock.calls[0][0]);
      expect(modalContent.html()).toMatchSnapshot();
    });

    describe('with a currently active modal', () => {
      let ref1: OverlayRef;

      beforeEach(() => {
        ref1 = modals.open(mountReactNode(<span>Modal content 1</span>));
      });

      it('replaces the current modal with a new one', () => {
        modals.open(mountReactNode(<span>Flyout content 2</span>));
        expect(mockReactDomRender.mock.calls).toMatchSnapshot();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
        expect(() => ref1.close()).not.toThrowError();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });

      it('resolves onClose on the previous ref', async () => {
        const onCloseComplete = jest.fn();
        ref1.onClose.then(onCloseComplete);
        modals.open(mountReactNode(<span>Flyout content 2</span>));
        await ref1.onClose;
        expect(onCloseComplete).toBeCalledTimes(1);
      });
    });
  });

  describe('ModalRef#close()', () => {
    it('resolves the onClose Promise', async () => {
      const ref = modals.open(mountReactNode(<span>Flyout content</span>));

      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);
      await ref.close();
      await ref.close();
      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times on the same ModalRef', async () => {
      const ref = modals.open(mountReactNode(<span>Flyout content</span>));
      expect(mockReactDomUnmount).not.toHaveBeenCalled();
      await ref.close();
      expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
      await ref.close();
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });

    it("on a stale ModalRef doesn't affect the active flyout", async () => {
      const ref1 = modals.open(mountReactNode(<span>Modal content 1</span>));
      const ref2 = modals.open(mountReactNode(<span>Modal content 2</span>));
      const onCloseComplete = jest.fn();
      ref2.onClose.then(onCloseComplete);
      mockReactDomUnmount.mockClear();
      await ref1.close();
      expect(mockReactDomUnmount).toBeCalledTimes(0);
      expect(onCloseComplete).toBeCalledTimes(0);
    });
  });
});
