/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PainlessContext, PainlessAutocompleteField } from '../types';

export interface EditorState {
  context: PainlessContext;
  fields?: PainlessAutocompleteField[];
}

export class EditorStateService {
  context: PainlessContext = 'painless_test';
  fields: PainlessAutocompleteField[] = [];

  public getState(): EditorState {
    return {
      context: this.context,
      fields: this.fields,
    };
  }

  public setup(context: PainlessContext, fields?: PainlessAutocompleteField[]) {
    this.context = context;

    if (fields) {
      this.fields = fields;
    }
  }
}
