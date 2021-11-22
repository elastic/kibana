/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { LazyExoticComponent, PureComponent } from 'react';
import { memoize } from 'lodash';
import { EuiDelayRender, EuiLoadingContent } from '@elastic/eui';
import type {
  FieldFormatEditorFactory,
  FieldFormatEditor as InnerFieldFormatEditor,
} from 'src/plugins/data_view_field_editor/public';
import type { FieldFormat } from 'src/plugins/field_formats/common';

export interface FieldFormatEditorProps {
  fieldType: string;
  fieldFormat: FieldFormat;
  fieldFormatId: string;
  fieldFormatParams: { [key: string]: unknown };
  fieldFormatEditors: any;
  onChange: (change: { [key: string]: any }) => void;
  onError: (error?: string) => void;
}

interface FieldFormatEditorState {
  EditorComponent: LazyExoticComponent<InnerFieldFormatEditor> | null;
}

// use memoize to get stable reference
const unwrapEditor = memoize(
  (editorFactory: FieldFormatEditorFactory | null): FieldFormatEditorState['EditorComponent'] => {
    if (!editorFactory) return null;
    return React.lazy(() => editorFactory().then((editor) => ({ default: editor })));
  }
);

export class FieldFormatEditor extends PureComponent<
  FieldFormatEditorProps,
  FieldFormatEditorState
> {
  constructor(props: FieldFormatEditorProps) {
    super(props);
    this.state = {
      EditorComponent: unwrapEditor(props.fieldFormatEditors.getById(props.fieldFormatId)),
    };
  }

  static getDerivedStateFromProps(nextProps: FieldFormatEditorProps) {
    return {
      EditorComponent: unwrapEditor(nextProps.fieldFormatEditors.getById(nextProps.fieldFormatId)),
    };
  }

  render() {
    const { EditorComponent } = this.state;
    const { fieldType, fieldFormat, fieldFormatParams, onChange, onError } = this.props;

    return (
      <>
        {EditorComponent ? (
          <React.Suspense
            fallback={
              // We specify minHeight to avoid too mitigate layout shifts while loading an editor
              // ~430 corresponds to "4 lines" of EuiLoadingContent
              <div style={{ minHeight: 430, marginTop: 8 }}>
                <EuiDelayRender>
                  <EuiLoadingContent lines={4} />
                </EuiDelayRender>
              </div>
            }
          >
            <EditorComponent
              fieldType={fieldType}
              format={fieldFormat}
              formatParams={fieldFormatParams}
              onChange={onChange}
              onError={onError}
            />
          </React.Suspense>
        ) : null}
      </>
    );
  }
}
