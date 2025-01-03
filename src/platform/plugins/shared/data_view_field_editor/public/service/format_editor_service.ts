/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    const defaultFieldFormatEditorFactories = [
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
    ] as FieldFormatEditorFactory[];

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
export interface FormatEditorServiceSetup {
  fieldFormatEditors: {
    register: (editor: FieldFormatEditorFactory) => void;
  };
}

/** @internal */
export interface FormatEditorServiceStart {
  fieldFormatEditors: {
    getAll: () => FieldFormatEditorFactory[];
    getById: <P>(id: string) => FieldFormatEditorFactory<P> | undefined;
  };
}
