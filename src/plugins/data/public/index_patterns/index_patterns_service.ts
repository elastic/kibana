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

import {
  IUiSettingsClient,
  SavedObjectsClientContract,
  HttpServiceBase,
  NotificationsStart,
} from 'src/core/public';
import { FieldFormatsStart } from '../field_formats_provider';
import { setNotifications, setFieldFormats } from './services';
import { IndexPatterns } from './index_patterns';

export interface IndexPatternDependencies {
  uiSettings: IUiSettingsClient;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpServiceBase;
  notifications: NotificationsStart;
  fieldFormats: FieldFormatsStart;
}

/**
 * Index Patterns Service
 *
 * @internal
 */
export class IndexPatternsService {
  private setupApi: any;

  public setup() {
    this.setupApi = {};

    return this.setupApi;
  }

  public start({
    uiSettings,
    savedObjectsClient,
    http,
    notifications,
    fieldFormats,
  }: IndexPatternDependencies) {
    setNotifications(notifications);
    setFieldFormats(fieldFormats);

    return {
      indexPatterns: new IndexPatterns(uiSettings, savedObjectsClient, http),
    };
  }

  public stop() {
    // nothing to do here yet
  }
}
