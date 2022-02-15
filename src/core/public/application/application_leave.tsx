/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ButtonColor } from '@elastic/eui';
import {
  AppLeaveActionFactory,
  AppLeaveActionType,
  AppLeaveAction,
  AppLeaveConfirmAction,
  AppLeaveHandler,
} from './types';

const appLeaveActionFactory: AppLeaveActionFactory = {
  confirm(
    text: string,
    title?: string,
    callback?: () => void,
    confirmButtonText?: string,
    buttonColor?: ButtonColor
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
};

export function isConfirmAction(action: AppLeaveAction): action is AppLeaveConfirmAction {
  return action.type === AppLeaveActionType.confirm;
}

export function getLeaveAction(handler?: AppLeaveHandler, nextAppId?: string): AppLeaveAction {
  if (!handler) {
    return appLeaveActionFactory.default();
  }
  return handler(appLeaveActionFactory, nextAppId);
}
