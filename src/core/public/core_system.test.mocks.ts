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

import { BasePathService } from './base_path';
import { ChromeService } from './chrome';
import { FatalErrorsService } from './fatal_errors';
import { HttpService } from './http';
import { I18nService } from './i18n';
import { InjectedMetadataService } from './injected_metadata';
import { LegacyPlatformService } from './legacy';
import { NotificationsService } from './notifications';
import { UiSettingsService } from './ui_settings';

export const MockLegacyPlatformService = jest.fn<LegacyPlatformService, any>(
  function _MockLegacyPlatformService(this: any) {
    this.start = jest.fn();
    this.stop = jest.fn();
    return this;
  }
);

jest.mock('./legacy', () => ({
  LegacyPlatformService: MockLegacyPlatformService,
}));

export const mockInjectedMetadataStart = {};
export const MockInjectedMetadataService = jest.fn<InjectedMetadataService, any>(
  function _MockInjectedMetadataService(this: any) {
    this.start = jest.fn().mockReturnValue(mockInjectedMetadataStart);
    return this;
  }
);
jest.mock('./injected_metadata', () => ({
  InjectedMetadataService: MockInjectedMetadataService,
}));

export const mockFatalErrorsStart = {};
export const MockFatalErrorsService = jest.fn<FatalErrorsService, any>(
  function _MockFatalErrorsService(this: any) {
    this.start = jest.fn().mockReturnValue(mockFatalErrorsStart);
    this.add = jest.fn();
    return this;
  }
);
jest.mock('./fatal_errors', () => ({
  FatalErrorsService: MockFatalErrorsService,
}));

export const mockI18nStart = {};
export const MockI18nService = jest.fn<I18nService, any>(function _MockI18nService(this: any) {
  this.start = jest.fn().mockReturnValue(mockI18nStart);
  this.stop = jest.fn();
  return this;
});
jest.mock('./i18n', () => ({
  I18nService: MockI18nService,
}));

export const mockNotificationStart = {};
export const MockNotificationsService = jest.fn<NotificationsService, any>(
  function _MockNotificationsService(this: any) {
    this.start = jest.fn().mockReturnValue(mockNotificationStart);
    this.add = jest.fn();
    this.stop = jest.fn();
    return this;
  }
);

jest.mock('./notifications', () => ({
  NotificationsService: MockNotificationsService,
}));

export const mockHttp = {};
export const MockHttpService = jest.fn<HttpService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockHttp);
  this.stop = jest.fn();
  return this;
});
jest.mock('./http', () => ({
  HttpService: MockHttpService,
}));

export const mockBasePathStart = {};
export const MockBasePathService = jest.fn<BasePathService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockBasePathStart);
  return this;
});
jest.mock('./base_path', () => ({
  BasePathService: MockBasePathService,
}));

const mockUiSettings = {};
export const MockUiSettingsService = jest.fn<UiSettingsService, any>(
  function _MockNotificationsService(this: any) {
    this.start = jest.fn().mockReturnValue(mockUiSettings);
    this.stop = jest.fn();
    return this;
  }
);
jest.mock('./ui_settings', () => ({
  UiSettingsService: MockUiSettingsService,
}));

const mockChromeStart = {};
export const MockChromeService = jest.fn<ChromeService, any>(function _MockNotificationsService(
  this: any
) {
  this.start = jest.fn().mockReturnValue(mockChromeStart);
  this.stop = jest.fn();
  return this;
});
jest.mock('./chrome', () => ({
  ChromeService: MockChromeService,
}));
