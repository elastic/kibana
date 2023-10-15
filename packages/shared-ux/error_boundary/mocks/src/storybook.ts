/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import { action } from '@storybook/addon-actions';
import { ErrorService } from '../../src/services/error_service';
import { ToastsService } from '../../src/services/toasts_service';
import { ErrorBoundaryServices } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Params {}

export class ErrorBoundaryStorybookMock extends AbstractStorybookMock<{}, ErrorBoundaryServices> {
  propArguments = {};

  serviceArguments = {};

  dependencies = [];

  getServices(params: Params = {}): ErrorBoundaryServices {
    const reloadWindowAction = action('Reload window');
    const reloadWindow = () => {
      reloadWindowAction();
    };

    return {
      ...params,
      reloadWindow,
      errorService: new ErrorService(),
      toastsService: new ToastsService({ reloadWindow }),
    };
  }

  getProps(params: Params) {
    return params;
  }
}

interface UserTableEntry {
  id: string;
  firstName: string | null | undefined;
  lastName: string;
  action: string;
}

export const getMockUserTable = (): UserTableEntry[] => {
  const users: UserTableEntry[] = [];

  users.push({
    id: 'user-123',
    firstName: 'Rodger',
    lastName: 'Turcotte',
    action: 'Rodger.Turcotte',
  });
  users.push({
    id: 'user-345',
    firstName: 'Bella',
    lastName: 'Cremin',
    action: 'Bella23',
  });
  users.push({
    id: 'user-678',
    firstName: 'Layne',
    lastName: 'Franecki',
    action: 'The_Real_Layne_2',
  });

  return users;
};
