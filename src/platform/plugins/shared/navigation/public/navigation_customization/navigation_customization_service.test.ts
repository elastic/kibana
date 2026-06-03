/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { NavigationCustomization } from '@kbn/core-chrome-browser';
import { NavigationCustomizationService } from './navigation_customization_service';

jest.mock('@kbn/navigation-customization-components', () => ({
  createCustomizeNavMenuLink: jest.fn((openModal: () => void) => ({
    iconType: 'controls',
    label: 'Customize navigation',
    href: '',
    order: 500,
    content: jest.fn(),
  })),
  openCustomizeNavigationModal: jest.fn(),
}));

/** Flush pending microtasks + macrotask so a dynamic import()'s .then() callback runs. */
const flushAsyncImport = () => new Promise((resolve) => setImmediate(resolve));

const makeDeps = (overrides?: {
  isUnauthenticated?: boolean;
  userStorageValue?: NavigationCustomization | undefined;
}) => {
  const userStorage$ = new Subject<NavigationCustomization | undefined>();

  const core = {
    userStorage: {
      get$: jest.fn().mockReturnValue(userStorage$),
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  } as unknown as Parameters<NavigationCustomizationService['start']>[0]['core'];

  const chrome = {
    project: {
      registerCustomizeNavigationHandler: jest.fn(),
      setNavigationCustomization: jest.fn(),
    },
  } as unknown as Parameters<NavigationCustomizationService['start']>[0]['chrome'];

  const security = {
    navControlService: {
      addUserMenuLinks: jest.fn(),
    },
  } as unknown as NonNullable<
    Parameters<NavigationCustomizationService['enableUi']>[0]['security']
  >;

  return {
    core,
    chrome,
    security,
    userStorage$,
    isUnauthenticated: overrides?.isUnauthenticated ?? false,
  };
};

describe('NavigationCustomizationService', () => {
  describe('start()', () => {
    it('subscribes to stored customization and calls setNavigationCustomization', () => {
      const { core, chrome, userStorage$, isUnauthenticated } = makeDeps();
      const service = new NavigationCustomizationService();

      service.start({ core, chrome, isUnauthenticated });

      const customization: NavigationCustomization = {
        moves: [{ id: 'a', afterId: null }],
        hidden: [],
      };
      userStorage$.next(customization);

      expect(chrome.project.setNavigationCustomization).toHaveBeenCalledWith(customization);
    });

    it('calls setNavigationCustomization with undefined when storage has no value', () => {
      const { core, chrome, userStorage$, isUnauthenticated } = makeDeps();
      const service = new NavigationCustomizationService();

      service.start({ core, chrome, isUnauthenticated });
      userStorage$.next(undefined);

      expect(chrome.project.setNavigationCustomization).toHaveBeenCalledWith(undefined);
    });

    it('does not subscribe when isUnauthenticated is true', () => {
      const { core, chrome } = makeDeps({ isUnauthenticated: true });
      const service = new NavigationCustomizationService();

      service.start({ core, chrome, isUnauthenticated: true });

      expect(core.userStorage.get$).not.toHaveBeenCalled();
      expect(chrome.project.setNavigationCustomization).not.toHaveBeenCalled();
    });

    it('stops forwarding updates after stop()', () => {
      const { core, chrome, userStorage$, isUnauthenticated } = makeDeps();
      const service = new NavigationCustomizationService();

      service.start({ core, chrome, isUnauthenticated });
      service.stop();

      userStorage$.next({ moves: [], hidden: [] });

      expect(chrome.project.setNavigationCustomization).not.toHaveBeenCalled();
    });
  });

  describe('enableUi()', () => {
    it('registers the chrome handler on first call', () => {
      const { core, chrome } = makeDeps();
      const service = new NavigationCustomizationService();

      service.enableUi({ core, chrome });

      expect(chrome.project.registerCustomizeNavigationHandler).toHaveBeenCalledTimes(1);
    });

    it('does not re-register the handler on subsequent calls', () => {
      const { core, chrome, security } = makeDeps();
      const service = new NavigationCustomizationService();

      service.enableUi({ core, chrome });
      service.enableUi({ core, chrome });
      service.enableUi({ core, chrome, security });

      expect(chrome.project.registerCustomizeNavigationHandler).toHaveBeenCalledTimes(1);
    });

    it('adds the user-menu link when security is provided', async () => {
      const { core, chrome, security } = makeDeps();
      const service = new NavigationCustomizationService();

      service.enableUi({ core, chrome, security });
      await flushAsyncImport();

      expect(security.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
      const [links] = (security.navControlService.addUserMenuLinks as jest.Mock).mock.calls[0];
      expect(links).toHaveLength(1);
      expect(links[0]).toMatchObject({ iconType: 'controls', order: 500 });
    });

    it('does not add the menu link when security is absent', async () => {
      const { core, chrome, security } = makeDeps();
      const service = new NavigationCustomizationService();

      service.enableUi({ core, chrome }); // no security
      await flushAsyncImport();

      expect(security.navControlService.addUserMenuLinks).not.toHaveBeenCalled();
    });

    it('adds the menu link once even when enableUi is called multiple times with security', async () => {
      const { core, chrome, security } = makeDeps();
      const service = new NavigationCustomizationService();

      service.enableUi({ core, chrome, security });
      service.enableUi({ core, chrome, security });
      await flushAsyncImport();

      expect(security.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
    });

    it('adds the menu link on a later call after the handler was registered without security', async () => {
      const { core, chrome, security } = makeDeps();
      const service = new NavigationCustomizationService();

      // Stateful path: register handler synchronously (no security yet)
      service.enableUi({ core, chrome });
      // Later: active space confirmed, add menu link
      service.enableUi({ core, chrome, security });
      await flushAsyncImport();

      expect(chrome.project.registerCustomizeNavigationHandler).toHaveBeenCalledTimes(1);
      expect(security.navControlService.addUserMenuLinks).toHaveBeenCalledTimes(1);
    });
  });
});
