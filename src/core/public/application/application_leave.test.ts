/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isConfirmAction, getLeaveAction } from './application_leave';
import { AppLeaveActionType } from './types';

describe('isConfirmAction', () => {
  it('returns true if action is confirm', () => {
    expect(isConfirmAction({ type: AppLeaveActionType.confirm, text: 'message' })).toEqual(true);
  });
  it('returns false if action is default', () => {
    expect(isConfirmAction({ type: AppLeaveActionType.default })).toEqual(false);
  });
});

describe('getLeaveAction', () => {
  it('returns the default action provided by the handler', () => {
    expect(getLeaveAction((actions) => actions.default())).toEqual({
      type: AppLeaveActionType.default,
    });
  });

  it('returns the default action provided by the handle and nextAppId', () => {
    expect(getLeaveAction((actions) => actions.default(), 'futureAppId')).toEqual({
      type: AppLeaveActionType.default,
    });
  });

  it('returns the confirm action provided by the handler', () => {
    expect(getLeaveAction((actions) => actions.confirm('some message'), 'futureAppId')).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'some message',
    });
    expect(getLeaveAction((actions) => actions.confirm('some message'))).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'some message',
    });
    expect(getLeaveAction((actions) => actions.confirm('another message', 'a title'))).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'another message',
      title: 'a title',
    });
    const callback = jest.fn();
    expect(
      getLeaveAction((actions) => actions.confirm('another message', 'a title', callback))
    ).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'another message',
      title: 'a title',
      callback,
    });
    expect(
      getLeaveAction((actions) =>
        actions.confirm('another message', 'a title', callback, 'confirm button text', 'danger')
      )
    ).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'another message',
      title: 'a title',
      callback,
      confirmButtonText: 'confirm button text',
      buttonColor: 'danger',
    });
  });
});
