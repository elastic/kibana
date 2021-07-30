/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';
import type { FieldFormat } from '../../../../../field_formats/common';
import type { FormatSelectEditorProps } from '../field_format_editor';

/**
 * Props for received by {@link FieldFormatEditor}
 * @public
 */
export interface FormatEditorProps<P> {
  fieldType: string;
  format: FieldFormat;
  formatParams: { type?: string } & P;
  onChange: (newParams: { [key: string]: any }) => void;
  onError: FormatSelectEditorProps['onError'];
}

/**
 * A React component for editing custom field format params
 * @public
 */
export type FieldFormatEditor<FormatParams = {}> = ComponentType<
  FormatEditorProps<FormatParams>
> & { formatId: string };

/**
 * A factory for registering field format editor for a field format with `formatId`
 * @public
 */
export type FieldFormatEditorFactory<FormatParams = any> = (() => Promise<
  FieldFormatEditor<FormatParams>
>) & {
  formatId: string;
};
