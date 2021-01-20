/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { HttpSetup } from '../../../../core/public';
import { IndexPatternCreationManager, IndexPatternCreationConfig } from './creation';
import { IndexPatternListManager, IndexPatternListConfig } from './list';
import { FieldFormatEditors } from './field_format_editors';
import { EnvironmentService } from './environment';

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
  environmentService: EnvironmentService;

  constructor() {
    this.indexPatternCreationManager = new IndexPatternCreationManager();
    this.indexPatternListConfig = new IndexPatternListManager();
    this.fieldFormatEditors = new FieldFormatEditors();
    this.environmentService = new EnvironmentService();
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
      environment: this.environmentService.setup(),
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
