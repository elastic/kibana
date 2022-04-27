/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { createNotifications } from './create_notifications';
// eslint-disable-next-lien
import { notificationServiceMock } from '@kbn/core/public/mocks';

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
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "color": undefined,
      "iconType": undefined,
      "onClose": undefined,
      "text": MountPoint {
        "reactNode": <React.Fragment />,
      },
      "title": MountPoint {
        "reactNode": "foo",
      },
      "toastLifeTimeMs": undefined,
    }
  `);
});

test('can display React element as title', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(0);

  wrapper.toasts.show({ title: <div>bar</div> });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect((notifications.toasts.add.mock.calls[0][0] as any).title).toMatchInlineSnapshot(`
    MountPoint {
      "reactNode": <div>
        bar
      </div>,
    }
  `);
});

test('can display React element as toast body', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.show({ body: <div>baz</div> });

  expect(notifications.toasts.add).toHaveBeenCalledTimes(1);
  expect((notifications.toasts.add.mock.calls[0][0] as any).text).toMatchInlineSnapshot(`
    MountPoint {
      "reactNode": <React.Fragment>
        <div>
          baz
        </div>
      </React.Fragment>,
    }
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
      "text": MountPoint {
        "reactNode": <React.Fragment>
          1
        </React.Fragment>,
      },
      "title": MountPoint {
        "reactNode": "2",
      },
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
  expect(notifications.toasts.add.mock.calls[0][0]).toMatchInlineSnapshot(`
    Object {
      "color": "success",
      "iconType": "check",
      "onClose": undefined,
      "text": MountPoint {
        "reactNode": <React.Fragment />,
      },
      "title": MountPoint {
        "reactNode": "1",
      },
      "toastLifeTimeMs": undefined,
    }
  `);
  expect(notifications.toasts.add.mock.calls[1][0]).toMatchInlineSnapshot(`
    Object {
      "color": "warning",
      "iconType": "help",
      "onClose": undefined,
      "text": MountPoint {
        "reactNode": <React.Fragment />,
      },
      "title": MountPoint {
        "reactNode": "2",
      },
      "toastLifeTimeMs": undefined,
    }
  `);
  expect(notifications.toasts.add.mock.calls[2][0]).toMatchInlineSnapshot(`
    Object {
      "color": "danger",
      "iconType": "alert",
      "onClose": undefined,
      "text": MountPoint {
        "reactNode": <React.Fragment />,
      },
      "title": MountPoint {
        "reactNode": "3",
      },
      "toastLifeTimeMs": undefined,
    }
  `);
});

test('if body is not set, renders it empty', () => {
  const notifications = notificationServiceMock.createStartContract();
  const wrapper = createNotifications({ notifications });

  wrapper.toasts.success({ title: '1' });

  expect((notifications.toasts.add.mock.calls[0][0] as any).text).toMatchInlineSnapshot(`
    MountPoint {
      "reactNode": <React.Fragment />,
    }
  `);
});
