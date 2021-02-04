/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent, Fragment } from 'react';
import type { DefaultFormatEditor } from 'src/plugins/index_pattern_field_editor/public';

export interface FieldFormatEditorProps {
  fieldType: string;
  fieldFormat: DefaultFormatEditor;
  fieldFormatId: string;
  fieldFormatParams: { [key: string]: unknown };
  fieldFormatEditors: any;
  onChange: (change: { fieldType: string; [key: string]: any }) => void;
  onError: (error?: string) => void;
}

interface EditorComponentProps {
  fieldType: FieldFormatEditorProps['fieldType'];
  format: FieldFormatEditorProps['fieldFormat'];
  formatParams: FieldFormatEditorProps['fieldFormatParams'];
  onChange: FieldFormatEditorProps['onChange'];
  onError: FieldFormatEditorProps['onError'];
}

interface FieldFormatEditorState {
  EditorComponent: React.FC<EditorComponentProps>;
}

export class FieldFormatEditor extends PureComponent<
  FieldFormatEditorProps,
  FieldFormatEditorState
> {
  constructor(props: FieldFormatEditorProps) {
    super(props);
    this.state = {
      EditorComponent: props.fieldFormatEditors.getById(props.fieldFormatId),
    };
  }

  static getDerivedStateFromProps(nextProps: FieldFormatEditorProps) {
    return {
      EditorComponent: nextProps.fieldFormatEditors.getById(nextProps.fieldFormatId) || null,
    };
  }

  render() {
    const { EditorComponent } = this.state;
    const { fieldType, fieldFormat, fieldFormatParams, onChange, onError } = this.props;

    return (
      <Fragment>
        {EditorComponent ? (
          <EditorComponent
            fieldType={fieldType}
            format={fieldFormat}
            formatParams={fieldFormatParams}
            onChange={onChange}
            onError={onError}
          />
        ) : null}
      </Fragment>
    );
  }
}
