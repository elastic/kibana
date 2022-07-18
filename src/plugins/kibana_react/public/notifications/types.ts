/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { Toast } from '@kbn/core/public';

export interface ToastInput {
  title?: React.ReactNode;
  body?: React.ReactNode;
  color?: Toast['color'];
  iconType?: Toast['iconType'];
  toastLifeTimeMs?: Toast['toastLifeTimeMs'];
  onClose?: Toast['onClose'];
}

export interface KibanaReactNotifications {
  toasts: {
    show: (input: ToastInput) => void;
    success: (input: ToastInput) => void;
    warning: (input: ToastInput) => void;
    danger: (input: ToastInput) => void;
  };
}
