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

import { DefaultFormatEditor } from '../../components/field_editor/components/field_format_editor';

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
