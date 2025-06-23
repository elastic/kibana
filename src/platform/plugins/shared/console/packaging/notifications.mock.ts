/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import { Observable } from 'rxjs';

// Toast API implementation without Jest
const createToastsApiMock = () => {
  const api = {
    get$: () => new Observable(),
    add: () => ({ id: 'mock-toast-id' }),
    remove: () => {},
    addInfo: () => ({ id: 'mock-toast-id' }),
    addSuccess: () => ({ id: 'mock-toast-id' }),
    addWarning: () => ({ id: 'mock-toast-id' }),
    addDanger: () => ({ id: 'mock-toast-id' }),
    addError: () => ({ id: 'mock-toast-id' }),
  };
  return api;
};

// Notification coordinator implementation without Jest
function createNotificationCoordinatorMock() {
  const notificationCoordinatorMock = () => ({
    optInToCoordination: (input$: any, cb: any) => input$,
    acquireLock: () => {},
    releaseLock: () => {},
    lock$: new Observable(),
  });

  return notificationCoordinatorMock;
}

const createSetupContractMock = (): NotificationsSetup => {
  const setupContract = {
    toasts: createToastsApiMock(),
    coordinator: createNotificationCoordinatorMock(),
  };
  return setupContract;
};

const createStartContractMock = (): NotificationsStart => {
  const startContract = {
    toasts: createToastsApiMock(),
    showErrorDialog: ({ title, error }: { title: string; error: Error }) => {
      console.error(`Error Dialog: ${title}`, error);
    },
  };
  return startContract;
};

/**
 * This is declared internally to avoid a circular dependency issue
 */
export interface NotificationsServiceContract {
  setup: typeof createSetupContractMock;
  start: ({ targetDomElement }: { targetDomElement: HTMLElement }) => void;
  stop: () => void;
}

const createMock = (): NotificationsServiceContract => {
  const mocked = {
    setup: () => createSetupContractMock(),
    start: ({ targetDomElement }: { targetDomElement: HTMLElement }) => {},
    stop: () => {},
  };
  return mocked;
};

export const notificationServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
