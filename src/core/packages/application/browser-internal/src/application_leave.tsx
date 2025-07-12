/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonColor } from '@elastic/eui';
import {
  AppLeaveActionType,
  type AppLeaveActionFactory,
  type AppLeaveAction,
  type AppLeaveConfirmAction,
  type AppLeaveCancelAction,
  type AppLeaveHandler,
  NavigateToAppOptions,
} from '@kbn/core-application-browser';

const appLeaveActionFactory: AppLeaveActionFactory = {
  confirm(
    text: string,
    title?: string,
    callback?: () => void,
    confirmButtonText?: string,
    buttonColor?: EuiButtonColor
  ) {
    return {
      type: AppLeaveActionType.confirm,
      text,
      title,
      confirmButtonText,
      buttonColor,
      callback,
    };
  },
  default() {
    return { type: AppLeaveActionType.default };
  },
  cancel() {
    return { type: AppLeaveActionType.cancel };
  },
};

export function isConfirmAction(action: AppLeaveAction): action is AppLeaveConfirmAction {
  return action.type === AppLeaveActionType.confirm;
}

export function isCancelAction(action: AppLeaveAction): action is AppLeaveCancelAction {
  return action.type === AppLeaveActionType.cancel;
}

export function getLeaveAction(
  handler?: AppLeaveHandler,
  next?: { nextAppId: string; options: NavigateToAppOptions }
): AppLeaveAction {
  if (!handler) {
    return appLeaveActionFactory.default();
  }
  if (!next) {
    return handler(appLeaveActionFactory, { nextAppId: '', options: {} });
  }

  return handler(appLeaveActionFactory, next);
}
