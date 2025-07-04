/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withNotifyOnErrors } from './errors';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

describe('state management URL errors', () => {
  const notifications = notificationServiceMock.createStartContract();

  beforeEach(() => {
    notifications.toasts.addError.mockClear();
  });

  test('notifies on restore error only once', () => {
    const { onGetError } = withNotifyOnErrors(notifications.toasts);
    const error = new Error();
    onGetError(error);
    onGetError(error);
    expect(notifications.toasts.addError).toBeCalledTimes(1);
  });

  test('notifies on save error only once', () => {
    const { onSetError } = withNotifyOnErrors(notifications.toasts);
    const error = new Error();
    onSetError(error);
    onSetError(error);
    expect(notifications.toasts.addError).toBeCalledTimes(1);
  });
});
