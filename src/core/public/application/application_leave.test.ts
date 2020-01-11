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
    expect(getLeaveAction(actions => actions.default())).toEqual({
      type: AppLeaveActionType.default,
    });
  });
  it('returns the confirm action provided by the handler', () => {
    expect(getLeaveAction(actions => actions.confirm('some message'))).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'some message',
    });
    expect(getLeaveAction(actions => actions.confirm('another message', 'a title'))).toEqual({
      type: AppLeaveActionType.confirm,
      text: 'another message',
      title: 'a title',
    });
  });
});
