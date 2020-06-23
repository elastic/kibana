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

import { HttpSetup } from '../../../../core/public';
import { IndexPatternCreationManager, IndexPatternCreationConfig } from './creation';
import { IndexPatternListManager, IndexPatternListConfig } from './list';
import { FieldFormatEditors } from './field_format_editors';

import {
  BytesFormatEditor,
  ColorFormatEditor,
  DateFormatEditor,
  DateNanosFormatEditor,
  DurationFormatEditor,
  NumberFormatEditor,
  PercentFormatEditor,
  StaticLookupFormatEditor,
  StringFormatEditor,
  TruncateFormatEditor,
  UrlFormatEditor,
} from '../components/field_editor/components/field_format_editor';

interface SetupDependencies {
  httpClient: HttpSetup;
}

/**
 * Index patterns management service
 *
 * @internal
 */
export class IndexPatternManagementService {
  indexPatternCreationManager: IndexPatternCreationManager;
  indexPatternListConfig: IndexPatternListManager;
  fieldFormatEditors: FieldFormatEditors;

  constructor() {
    this.indexPatternCreationManager = new IndexPatternCreationManager();
    this.indexPatternListConfig = new IndexPatternListManager();
    this.fieldFormatEditors = new FieldFormatEditors();
  }

  public setup({ httpClient }: SetupDependencies) {
    const creationManagerSetup = this.indexPatternCreationManager.setup(httpClient);
    creationManagerSetup.addCreationConfig(IndexPatternCreationConfig);

    const indexPatternListConfigSetup = this.indexPatternListConfig.setup();
    indexPatternListConfigSetup.addListConfig(IndexPatternListConfig);

    const defaultFieldFormatEditors = [
      BytesFormatEditor,
      ColorFormatEditor,
      DateFormatEditor,
      DateNanosFormatEditor,
      DurationFormatEditor,
      NumberFormatEditor,
      PercentFormatEditor,
      StaticLookupFormatEditor,
      StringFormatEditor,
      TruncateFormatEditor,
      UrlFormatEditor,
    ];

    const fieldFormatEditorsSetup = this.fieldFormatEditors.setup(defaultFieldFormatEditors);

    return {
      creation: creationManagerSetup,
      list: indexPatternListConfigSetup,
      fieldFormatEditors: fieldFormatEditorsSetup,
    };
  }

  public start() {
    return {
      creation: this.indexPatternCreationManager.start(),
      list: this.indexPatternListConfig.start(),
      fieldFormatEditors: this.fieldFormatEditors.start(),
    };
  }

  public stop() {
    // nothing to do here yet.
  }
}

/** @internal */
export type IndexPatternManagementServiceSetup = ReturnType<IndexPatternManagementService['setup']>;
export type IndexPatternManagementServiceStart = ReturnType<IndexPatternManagementService['start']>;
