/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatEditors } from './field_format_editors';

import {
  bytesFormatEditorFactory,
  colorFormatEditorFactory,
  dateFormatEditorFactory,
  dateNanosFormatEditorFactory,
  durationFormatEditorFactory,
  geoPointFormatEditorFactory,
  numberFormatEditorFactory,
  percentFormatEditorFactory,
  staticLookupFormatEditorFactory,
  stringFormatEditorFactory,
  truncateFormatEditorFactory,
  urlFormatEditorFactory,
  histogramFormatEditorFactory,
  FieldFormatEditorFactory,
} from '../components';

/**
 * Index patterns management service
 *
 * @internal
 */
export class FormatEditorService {
  fieldFormatEditors: FieldFormatEditors;

  constructor() {
    this.fieldFormatEditors = new FieldFormatEditors();
  }

  public setup() {
    const defaultFieldFormatEditorFactories: FieldFormatEditorFactory[] = [
      bytesFormatEditorFactory,
      colorFormatEditorFactory,
      dateFormatEditorFactory,
      dateNanosFormatEditorFactory,
      durationFormatEditorFactory,
      geoPointFormatEditorFactory,
      numberFormatEditorFactory,
      percentFormatEditorFactory,
      staticLookupFormatEditorFactory,
      stringFormatEditorFactory,
      truncateFormatEditorFactory,
      urlFormatEditorFactory,
      histogramFormatEditorFactory,
    ];

    const fieldFormatEditorsSetup = this.fieldFormatEditors.setup(
      defaultFieldFormatEditorFactories
    );

    return {
      fieldFormatEditors: fieldFormatEditorsSetup,
    };
  }

  public start() {
    return {
      fieldFormatEditors: this.fieldFormatEditors.start(),
    };
  }

  public stop() {
    // nothing to do here yet.
  }
}

/** @internal */
export type FormatEditorServiceSetup = ReturnType<FormatEditorService['setup']>;
export type FormatEditorServiceStart = ReturnType<FormatEditorService['start']>;
