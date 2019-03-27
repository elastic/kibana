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

import React from 'react';

import { i18nServiceMock } from '../i18n/i18n_service.mock';
import { FlyoutService } from './flyout';

const i18nMock = i18nServiceMock.createSetupContract();

describe('Flyout', () => {
  describe('openFlyout()', () => {
    describe('return value', () => {
      it('should be an object with a close function', () => {
        const session = new FlyoutService().openFlyout(i18nMock, <span>Flyout content</span>);
        expect(typeof session.close).toBe('function');
      });

      // it('should emit the "closed" event if another inspector opens', () => {
      //   const session = Inspector.open({});
      //   const spy = jest.fn();
      //   session.on('closed', spy);
      //   Inspector.open({});
      //   expect(spy).toHaveBeenCalled();
      // });

      // it('should emit the "closed" event if you call close', () => {
      //   const session = Inspector.open({});
      //   const spy = jest.fn();
      //   session.on('closed', spy);
      //   session.close();
      //   expect(spy).toHaveBeenCalled();
      // });
    });
  });
});
