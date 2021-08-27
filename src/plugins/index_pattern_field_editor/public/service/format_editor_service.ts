/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { bytesFormatEditorFactory } from '../components/field_format_editor/editors/bytes';
import { colorFormatEditorFactory } from '../components/field_format_editor/editors/color';
import { dateFormatEditorFactory } from '../components/field_format_editor/editors/date';
import { dateNanosFormatEditorFactory } from '../components/field_format_editor/editors/date_nanos';
import { durationFormatEditorFactory } from '../components/field_format_editor/editors/duration';
import { histogramFormatEditorFactory } from '../components/field_format_editor/editors/histogram';
import { numberFormatEditorFactory } from '../components/field_format_editor/editors/number';
import { percentFormatEditorFactory } from '../components/field_format_editor/editors/percent';
import { staticLookupFormatEditorFactory } from '../components/field_format_editor/editors/static_lookup';
import { stringFormatEditorFactory } from '../components/field_format_editor/editors/string';
import { truncateFormatEditorFactory } from '../components/field_format_editor/editors/truncate';
import type { FieldFormatEditorFactory } from '../components/field_format_editor/editors/types';
import { urlFormatEditorFactory } from '../components/field_format_editor/editors/url';
import { FieldFormatEditors } from './field_format_editors/field_format_editors';

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
