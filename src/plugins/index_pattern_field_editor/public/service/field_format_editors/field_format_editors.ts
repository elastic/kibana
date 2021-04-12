/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultFormatEditor } from '../../components/field_format_editor';

export class FieldFormatEditors {
  private editors: Array<typeof DefaultFormatEditor> = [];

  public setup(defaultFieldEditors: FieldFormatEditors['editors'] = []) {
    this.editors = defaultFieldEditors;

    return {
      register: (editor: typeof DefaultFormatEditor) => {
        this.editors.push(editor);
      },
    };
  }

  public start() {
    return {
      getAll: () => [...this.editors],
      getById: (id: string) => {
        return this.editors.find((editor) => editor.formatId === id);
      },
    };
  }
}
