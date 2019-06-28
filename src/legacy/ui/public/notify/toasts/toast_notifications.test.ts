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

import sinon from 'sinon';
import { ToastsApi } from '../../../../../core/public';
import { uiSettingsServiceMock, i18nServiceMock } from '../../../../../core/public/mocks';
import { ToastNotifications } from './toast_notifications';

function toastDeps() {
  const uiSettingsMock = uiSettingsServiceMock.createSetupContract();
  (uiSettingsMock.get as jest.Mock<typeof uiSettingsMock['get']>).mockImplementation(
    () => (config: string) => {
      switch (config) {
        case 'notifications:lifetime:info':
          return 5000;
        case 'notifications:lifetime:warning':
          return 10000;
        case 'notification:lifetime:error':
          return 30000;
        default:
          throw new Error(`Accessing ${config} is not supported in the mock.`);
      }
    }
  );
  return {
    uiSettings: uiSettingsMock,
    i18n: i18nServiceMock.createStartContract(),
  };
}

describe('ToastNotifications', () => {
  describe('interface', () => {
    function setup() {
      return { toastNotifications: new ToastNotifications(new ToastsApi(toastDeps())) };
    }

    describe('add method', () => {
      test('adds a toast', () => {
        const { toastNotifications } = setup();
        toastNotifications.add({});
        expect(toastNotifications.list).toHaveLength(1);
      });

      test('adds a toast with an ID property', () => {
        const { toastNotifications } = setup();
        toastNotifications.add({});
        expect(toastNotifications.list[0]).toHaveProperty('id', '0');
      });

      test('increments the toast ID', () => {
        const { toastNotifications } = setup();
        toastNotifications.add({});
        toastNotifications.add({});
        expect(toastNotifications.list[1]).toHaveProperty('id', '1');
      });

      test('accepts a string', () => {
        const { toastNotifications } = setup();
        toastNotifications.add('New toast');
        expect(toastNotifications.list[0]).toHaveProperty('title', 'New toast');
      });
    });

    describe('remove method', () => {
      test('removes a toast', () => {
        const { toastNotifications } = setup();
        const toast = toastNotifications.add('Test');
        toastNotifications.remove(toast);
        expect(toastNotifications.list).toHaveLength(0);
      });

      test('ignores unknown toast', () => {
        const { toastNotifications } = setup();
        const toast = toastNotifications.add('Test');
        toastNotifications.remove({
          id: `not ${toast.id}`,
        });
        expect(toastNotifications.list).toHaveLength(1);
      });
    });

    describe('onChange method', () => {
      test('callback is called when a toast is added', () => {
        const { toastNotifications } = setup();
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        toastNotifications.add({});
        sinon.assert.calledOnce(onChangeSpy);
      });

      test('callback is called when a toast is removed', () => {
        const { toastNotifications } = setup();
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        const toast = toastNotifications.add({});
        toastNotifications.remove(toast);
        sinon.assert.calledTwice(onChangeSpy);
      });

      test('callback is not called when remove is ignored', () => {
        const { toastNotifications } = setup();
        const onChangeSpy = sinon.spy();
        toastNotifications.onChange(onChangeSpy);
        toastNotifications.remove({ id: 'foo' });
        sinon.assert.notCalled(onChangeSpy);
      });
    });

    describe('addSuccess method', () => {
      test('adds a success toast', () => {
        const { toastNotifications } = setup();
        toastNotifications.addSuccess({});
        expect(toastNotifications.list[0]).toHaveProperty('color', 'success');
      });
    });

    describe('addWarning method', () => {
      test('adds a warning toast', () => {
        const { toastNotifications } = setup();
        toastNotifications.addWarning({});
        expect(toastNotifications.list[0]).toHaveProperty('color', 'warning');
      });
    });

    describe('addDanger method', () => {
      test('adds a danger toast', () => {
        const { toastNotifications } = setup();
        toastNotifications.addDanger({});
        expect(toastNotifications.list[0]).toHaveProperty('color', 'danger');
      });
    });
  });
});
