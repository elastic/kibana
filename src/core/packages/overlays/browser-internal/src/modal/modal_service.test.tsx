/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockReactDomRender, mockReactDomUnmount } from '../overlay.test.mocks';

import React from 'react';
import { mount } from 'enzyme';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { i18nServiceMock } from '@kbn/core-i18n-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { ModalService } from './modal_service';
import type { OverlayModalStart } from '@kbn/core-overlays-browser';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';

const analyticsMock = analyticsServiceMock.createAnalyticsServiceStart();
const i18nMock = i18nServiceMock.createStartContract();
const themeMock = themeServiceMock.createStartContract();
const userProfileMock = userProfileServiceMock.createStart();

const MODAL_CONTENT = 'Modal content 1';
const MODAL_CONTENT_TWO = 'Modal content 2';
const SOME_CONFIRM = 'Some confirm';

beforeEach(() => {
  mockReactDomRender.mockClear();
  mockReactDomUnmount.mockClear();
});

const getServiceStart = () => {
  const service = new ModalService();
  return service.start({
    analytics: analyticsMock,
    i18n: i18nMock,
    theme: themeMock,
    userProfile: userProfileMock,
    targetDomElement: document.createElement('div'),
  });
};

describe('ModalService', () => {
  let modals: OverlayModalStart;
  beforeEach(() => {
    modals = getServiceStart();
  });

  describe('openModal()', () => {
    it('renders a modal to the DOM', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      modals.open((container) => {
        const content = document.createElement('span');
        content.textContent = MODAL_CONTENT;
        container.append(content);
        return () => {};
      });
      expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual('EuiModal');
      const modalContent = mount(mockReactDomRender.mock.calls[0][0]);
      expect(modalContent.find('div.euiModal').text()).toEqual(MODAL_CONTENT);
    });

    describe('with a currently active modal', () => {
      let ref1: OverlayRef;

      beforeEach(() => {
        ref1 = modals.open(mountReactNode(<span>`${MODAL_CONTENT}`</span>));
      });

      it('replaces the current modal with a new one', () => {
        const mountPoint = mountReactNode(<span>Flyout content 2</span>);
        modals.open(mountPoint);
        expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual('EuiModal');
        expect(mockReactDomRender.mock.calls[1][0].props.children.type.name).toEqual('EuiModal');

        const modalContent = mount(mockReactDomRender.mock.calls[1][0]);
        expect((modalContent.find('MountWrapper').props() as any).mount).toEqual(mountPoint);
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

    describe('with a currently active confirm', () => {
      let confirm1: Promise<boolean>;

      beforeEach(() => {
        confirm1 = modals.openConfirm('confirm 1');
      });

      it('replaces the current confirm with the new one', () => {
        modals.openConfirm(SOME_CONFIRM);

        expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual(
          'EuiConfirmModal'
        );
        expect(mockReactDomRender.mock.calls[1][0].props.children.type.name).toEqual(
          'EuiConfirmModal'
        );

        const modalContent = mount(mockReactDomRender.mock.calls[1][0]);
        expect(modalContent.find('EuiText[data-test-subj="confirmModalBodyText"]').text()).toEqual(
          SOME_CONFIRM
        );

        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });

      it('resolves the previous confirm promise', async () => {
        modals.open(mountReactNode(<span>Flyout content 2</span>));
        expect(await confirm1).toEqual(false);
      });
    });
  });

  describe('openConfirm()', () => {
    it('renders a mountpoint confirm message', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      modals.openConfirm((container) => {
        const content = document.createElement('span');
        content.textContent = MODAL_CONTENT;
        container.append(content);
        return () => {};
      });
      expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual(
        'EuiConfirmModal'
      );
      const modalContent = mount(mockReactDomRender.mock.calls[0][0]);
      expect(modalContent.find('EuiText[data-test-subj="confirmModalBodyText"]').text()).toEqual(
        MODAL_CONTENT
      );
    });

    it('renders a string confirm message', () => {
      expect(mockReactDomRender).not.toHaveBeenCalled();
      modals.openConfirm(SOME_CONFIRM);
      expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual(
        'EuiConfirmModal'
      );
      const modalContent = mount(mockReactDomRender.mock.calls[0][0]);
      expect(modalContent.find('EuiText[data-test-subj="confirmModalBodyText"]').text()).toEqual(
        SOME_CONFIRM
      );
    });

    describe('with a currently active modal', () => {
      let ref1: OverlayRef;

      beforeEach(() => {
        ref1 = modals.open(mountReactNode(<span>`${MODAL_CONTENT}`</span>));
      });

      it('replaces the current modal with the new confirm', () => {
        modals.openConfirm(SOME_CONFIRM);

        expect(mockReactDomRender.mock.calls[1][0].props.children.type.name).toEqual(
          'EuiConfirmModal'
        );
        const modalContent = mount(mockReactDomRender.mock.calls[1][0]);
        expect(modalContent.find('EuiText[data-test-subj="confirmModalBodyText"]').text()).toEqual(
          SOME_CONFIRM
        );

        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
        expect(() => ref1.close()).not.toThrowError();
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });

      it('resolves onClose on the previous ref', async () => {
        const onCloseComplete = jest.fn();
        ref1.onClose.then(onCloseComplete);
        modals.openConfirm(SOME_CONFIRM);
        await ref1.onClose;
        expect(onCloseComplete).toBeCalledTimes(1);
      });
    });

    describe('with a currently active confirm', () => {
      let confirm1: Promise<boolean>;

      beforeEach(() => {
        confirm1 = modals.openConfirm('confirm 1');
      });

      it('replaces the current confirm with the new one', () => {
        modals.openConfirm(SOME_CONFIRM);

        expect(mockReactDomRender.mock.calls[0][0].props.children.type.name).toEqual(
          'EuiConfirmModal'
        );
        expect(mockReactDomRender.mock.calls[1][0].props.children.type.name).toEqual(
          'EuiConfirmModal'
        );

        const modalContent = mount(mockReactDomRender.mock.calls[1][0]);
        expect(modalContent.find('EuiText[data-test-subj="confirmModalBodyText"]').text()).toEqual(
          SOME_CONFIRM
        );
        expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
      });

      it('resolves the previous confirm promise', async () => {
        modals.openConfirm(SOME_CONFIRM);
        expect(await confirm1).toEqual(false);
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
      expect(mockReactDomUnmount.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            <div />,
          ],
        ]
      `);
      await ref.close();
      expect(mockReactDomUnmount).toHaveBeenCalledTimes(1);
    });

    it("on a stale ModalRef doesn't affect the active flyout", async () => {
      const ref1 = modals.open(mountReactNode(<span>`${MODAL_CONTENT}`</span>));
      const ref2 = modals.open(mountReactNode(<span>`${MODAL_CONTENT_TWO}`</span>));
      const onCloseComplete = jest.fn();
      ref2.onClose.then(onCloseComplete);
      mockReactDomUnmount.mockClear();
      await ref1.close();
      expect(mockReactDomUnmount).toBeCalledTimes(0);
      expect(onCloseComplete).toBeCalledTimes(0);
    });
  });
});
