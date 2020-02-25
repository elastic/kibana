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
