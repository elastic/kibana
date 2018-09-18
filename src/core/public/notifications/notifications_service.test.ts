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

jest.mock('./toasts/toasts_service');
jest.mock('./banners/banners_service');

import { NotificationsService } from './notifications_service';

const { ToastsService } = require.requireMock('./toasts/toasts_service');
const { BannersService } = require.requireMock('./banners/banners_service');

beforeEach(() => {
  jest.clearAllMocks();
});

it('creates toasts and banner services, passing unique containers to each which are mounted in start and unmounted after stop()', () => {
  expect.assertions(16);
  const targetDomElement = document.createElement('div');
  const notifications = new NotificationsService({
    targetDomElement,
  });

  expect(ToastsService).toHaveBeenCalledTimes(1);
  expect(ToastsService).toHaveBeenCalledWith({
    targetDomElement: expect.any(HTMLDivElement),
  });

  expect(BannersService).toHaveBeenCalledTimes(1);
  expect(BannersService).toHaveBeenCalledWith({
    targetDomElement: expect.any(HTMLDivElement),
  });

  const [[{ targetDomElement: toastsContainer }]] = ToastsService.mock.calls;
  const [[{ targetDomElement: bannersContainer }]] = BannersService.mock.calls;
  expect(toastsContainer).not.toBe(bannersContainer);
  expect(toastsContainer.parentElement).toBe(null);
  expect(bannersContainer.parentElement).toBe(null);

  ToastsService.prototype.start.mockImplementation(() => {
    expect(toastsContainer.parentElement).toBe(targetDomElement);
  });

  ToastsService.prototype.stop.mockImplementation(() => {
    expect(toastsContainer.parentElement).toBe(targetDomElement);
  });

  BannersService.prototype.start.mockImplementation(() => {
    expect(bannersContainer.parentElement).toBe(targetDomElement);
  });

  BannersService.prototype.stop.mockImplementation(() => {
    expect(bannersContainer.parentElement).toBe(targetDomElement);
  });

  notifications.start();
  notifications.stop();

  expect(BannersService.prototype.stop).toHaveBeenCalledTimes(1);
  expect(ToastsService.prototype.stop).toHaveBeenCalledTimes(1);
  expect(bannersContainer.parentElement).toBe(null);
  expect(toastsContainer.parentElement).toBe(null);
  expect(targetDomElement).toMatchInlineSnapshot(`<div />`);
});
