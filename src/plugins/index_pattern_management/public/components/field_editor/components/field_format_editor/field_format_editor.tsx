/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType, LazyExoticComponent, PureComponent } from 'react';
import memoize from 'lodash/memoize';
import { EuiDelayRender, EuiLoadingContent } from '@elastic/eui';
import type {
  DefaultFormatEditor,
  FieldFormatEditorFactory,
} from 'src/plugins/index_pattern_field_editor/public';

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
  EditorComponent: LazyExoticComponent<ComponentType<EditorComponentProps>> | null;
}

// use memoize to get stable reference
const unwrapEditor = memoize(
  (editorFactory: FieldFormatEditorFactory | null): FieldFormatEditorState['EditorComponent'] => {
    if (!editorFactory) return null;

    // @ts-ignore
    // TODO: Type '(change: { [key: string]: any; fieldType: string; }) => void' is not assignable to type '(newParams: Record<string, any>) => void'.
    // https://github.com/elastic/kibana/issues/104637
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
              <EuiDelayRender>
                <EuiLoadingContent lines={4} style={{ marginTop: 8, display: 'block' }} />
              </EuiDelayRender>
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
