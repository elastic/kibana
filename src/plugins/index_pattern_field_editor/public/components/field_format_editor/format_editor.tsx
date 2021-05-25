/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PureComponent, Fragment } from 'react';
import { FieldFormat } from 'src/plugins/data/public';

export interface FormatEditorProps {
  fieldType: string;
  fieldFormat: FieldFormat;
  fieldFormatId: string;
  fieldFormatParams: { [key: string]: unknown };
  fieldFormatEditors: any;
  onChange: (change: { fieldType: string; [key: string]: any }) => void;
  onError: (error?: string) => void;
}

interface EditorComponentProps {
  fieldType: FormatEditorProps['fieldType'];
  format: FormatEditorProps['fieldFormat'];
  formatParams: FormatEditorProps['fieldFormatParams'];
  onChange: FormatEditorProps['onChange'];
  onError: FormatEditorProps['onError'];
}

interface FormatEditorState {
  EditorComponent: React.FC<EditorComponentProps>;
  fieldFormatId?: string;
}

export class FormatEditor extends PureComponent<FormatEditorProps, FormatEditorState> {
  constructor(props: FormatEditorProps) {
    super(props);
    this.state = {
      EditorComponent: props.fieldFormatEditors.getById(props.fieldFormatId),
    };
  }

  static getDerivedStateFromProps(nextProps: FormatEditorProps) {
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
