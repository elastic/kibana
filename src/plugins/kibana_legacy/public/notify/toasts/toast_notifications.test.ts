/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { notificationServiceMock } from '../../../../../core/public/mocks';
import { ToastNotifications } from './toast_notifications';
import { Toast } from 'kibana/public';
import { BehaviorSubject } from 'rxjs';

describe('ToastNotifications', () => {
  describe('interface', () => {
    function setup() {
      const toastsMock = notificationServiceMock.createStartContract().toasts;
      return { toastNotifications: new ToastNotifications(toastsMock), toastsMock };
    }

    describe('add method', () => {
      test('adds a toast', () => {
        const { toastNotifications, toastsMock } = setup();
        toastNotifications.add({});
        expect(toastsMock.add).toHaveBeenCalled();
      });
    });

    describe('remove method', () => {
      test('removes a toast', () => {
        const { toastNotifications, toastsMock } = setup();
        const fakeToast = {} as Toast;
        toastNotifications.remove(fakeToast);
        expect(toastsMock.remove).toHaveBeenCalledWith(fakeToast);
      });
    });

    describe('onChange method', () => {
      test('callback is called when observable changes', () => {
        const toastsMock = notificationServiceMock.createStartContract().toasts;
        const toasts$ = new BehaviorSubject<any>([]);
        toastsMock.get$.mockReturnValue(toasts$);
        const toastNotifications = new ToastNotifications(toastsMock);
        const onChangeSpy = jest.fn();
        toastNotifications.onChange(onChangeSpy);
        toasts$.next([{ id: 'toast1' }]);
        toasts$.next([]);
        expect(onChangeSpy).toHaveBeenCalledTimes(2);
      });
    });

    describe('addSuccess method', () => {
      test('adds a success toast', () => {
        const { toastNotifications, toastsMock } = setup();
        toastNotifications.addSuccess({});
        expect(toastsMock.addSuccess).toHaveBeenCalled();
      });
    });

    describe('addWarning method', () => {
      test('adds a warning toast', () => {
        const { toastNotifications, toastsMock } = setup();
        toastNotifications.addWarning({});
        expect(toastsMock.addWarning).toHaveBeenCalled();
      });
    });

    describe('addDanger method', () => {
      test('adds a danger toast', () => {
        const { toastNotifications, toastsMock } = setup();
        toastNotifications.addWarning({});
        expect(toastsMock.addWarning).toHaveBeenCalled();
      });
    });
  });
});
