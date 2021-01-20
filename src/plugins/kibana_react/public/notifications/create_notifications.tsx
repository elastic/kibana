/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as React from 'react';
import { KibanaServices } from '../context/types';
import { KibanaReactNotifications } from './types';
import { toMountPoint } from '../util';

export const createNotifications = (services: KibanaServices): KibanaReactNotifications => {
  const show: KibanaReactNotifications['toasts']['show'] = ({
    title,
    body,
    color,
    iconType,
    toastLifeTimeMs,
    onClose,
  }) => {
    if (!services.notifications) {
      throw new TypeError('Could not show notification as notifications service is not available.');
    }
    services.notifications!.toasts.add({
      title: toMountPoint(title),
      text: toMountPoint(<>{body || null}</>),
      color,
      iconType,
      toastLifeTimeMs,
      onClose,
    });
  };

  const success: KibanaReactNotifications['toasts']['success'] = (input) =>
    show({ color: 'success', iconType: 'check', ...input });

  const warning: KibanaReactNotifications['toasts']['warning'] = (input) =>
    show({ color: 'warning', iconType: 'help', ...input });

  const danger: KibanaReactNotifications['toasts']['danger'] = (input) =>
    show({ color: 'danger', iconType: 'alert', ...input });

  const notifications: KibanaReactNotifications = {
    toasts: {
      show,
      success,
      warning,
      danger,
    },
  };

  return notifications;
};
