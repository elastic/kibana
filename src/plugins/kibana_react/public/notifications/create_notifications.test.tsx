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

import * as React from 'react';
import { createNotifications } from './create_notifications';
// eslint-disable-next-lien
import { notificationServiceMock } from '../../../../core/public/mocks';

test('throws if no overlays service provided', () => {
  const notifications = createNotifications({});
  expect(() => notifications.toasts.show({})).toThrowErrorMatchingInlineSnapshot(
    `"Could not show notification as notifications service is not available."`
  );
});

test('creates wrapped notifications service', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  expect(wrapper).toMatchObject({
    toasts: {
      show: expect.any(Function),
      success: expect.any(Function),
      warning: expect.any(Function),
      danger: expect.any(Function),
    },
  });
});

test('can display string element as title', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(0);

  wrapper.toasts.show({ title: 'foo' });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchObject({
    title: 'foo',
  });
});

test('can display React element as title', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(0);

  wrapper.toasts.show({ title: <div>bar</div> });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect((notifications.toasts.add.mock.calls[0][0] as any).title).toMatchInlineSnapshot(`
        <div>
          bar
        </div>
    `);
});

test('can display React element as toast body', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.show({ body: <div>baz</div> });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect((notifications.toasts.add.mock.calls[0][0] as any).text).toMatchInlineSnapshot(`
        <React.Fragment>
          <div>
            baz
          </div>
        </React.Fragment>
    `);
});

test('can set toast properties', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.show({
    body: '1',
    color: 'danger',
    iconType: 'foo',
    title: '2',
    toastLifeTimeMs: 3,
  });

  expect(notifications.toasts.add.mock.calls[0][0]).toMatchInlineSnapshot(`
        Object {
          "color": "danger",
          "iconType": "foo",
          "onClose": undefined,
          "text": <React.Fragment>
            1
          </React.Fragment>,
          "title": "2",
          "toastLifeTimeMs": 3,
        }
    `);
});

test('can display success, warning and danger toasts', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.success({ title: '1' });
  wrapper.toasts.warning({ title: '2' });
  wrapper.toasts.danger({ title: '3' });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(3);
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchObject({
    title: '1',
    color: 'success',
    iconType: 'check',
  });
  expect(notifications.toasts.add.mock.calls[1][0]).toMatchObject({
    title: '2',
    color: 'warning',
    iconType: 'help',
  });
  expect(notifications.toasts.add.mock.calls[2][0]).toMatchObject({
    title: '3',
    color: 'danger',
    iconType: 'alert',
  });
});

test('if body is not set, renders it empty', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.success({ title: '1' });

  expect((notifications.toasts.add.mock.calls[0][0] as any).text).toMatchInlineSnapshot(
    `<React.Fragment />`
  );
});
