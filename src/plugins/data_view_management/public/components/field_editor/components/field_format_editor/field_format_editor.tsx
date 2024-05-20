/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import type {
  FieldFormatEditor as InnerFieldFormatEditor,
  FieldFormatEditorFactory,
} from '@kbn/data-view-field-editor-plugin/public';
import { FormatEditorServiceStart } from '@kbn/data-view-field-editor-plugin/public';
import type { FieldFormat, FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { memoize } from 'lodash';
import React, { LazyExoticComponent, PureComponent } from 'react';

export interface FieldFormatEditorProps {
  fieldType: string;
  fieldFormat: FieldFormat;
  fieldFormatId: string;
  fieldFormatParams: FieldFormatParams<{ type?: string }>;
  fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
  onChange: (change: FieldFormatParams) => void;
  onError: (error?: string) => void;
}

interface FieldFormatEditorState {
  EditorComponent: LazyExoticComponent<InnerFieldFormatEditor<FieldFormatParams>> | null;
}

// use memoize to get stable reference
const unwrapEditor = memoize(
  (
    editorFactory: FieldFormatEditorFactory<FieldFormatParams> | undefined
  ): FieldFormatEditorState['EditorComponent'] => {
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
              // ~430 corresponds to "4 lines" of EuiSkeletonText
              <div style={{ minHeight: 430, marginTop: 8 }}>
                <EuiDelayRender>
                  <EuiSkeletonText lines={4} />
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
