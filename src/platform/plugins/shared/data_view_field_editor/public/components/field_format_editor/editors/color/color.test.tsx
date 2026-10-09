/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import React from 'react';
import { ColorFormatEditor } from './color';
import { DEFAULT_CONVERTER_COLOR } from '@kbn/field-formats-plugin/common';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const fieldType = 'string';

const format = {
  convertToReact: jest.fn(),
};

const formatParams = {
  colors: [{ ...DEFAULT_CONVERTER_COLOR }],
};

const onChange = jest.fn();
const onError = jest.fn();

const renderEditor = (params = formatParams, props: { fieldType?: string } = {}) =>
  renderWithI18n(
    <ColorFormatEditor
      fieldType={props.fieldType ?? fieldType}
      format={format as unknown as FieldFormat}
      formatParams={params}
      onChange={onChange}
      onError={onError}
    />
  );

describe('ColorFormatEditor', () => {
  it('should have a formatId', () => {
    expect(ColorFormatEditor.formatId).toEqual(formatId);
  });

  it('renders the color swatch icon inside the button', () => {
    renderEditor(formatParams, { fieldType: 'color' });

    expect(screen.getAllByTestId('buttonColorSwatchIcon')).toHaveLength(2);
  });

  it('should render string type normally (regex field)', () => {
    renderEditor();

    expect(screen.getByText('Color formatting')).toBeVisible();
    expect(screen.getByTestId('colorEditorKeyPattern 0')).toBeVisible();
    expect(screen.getByTestId('colorEditorAddColor')).toHaveTextContent('Add color');
  });

  it('should render boolean type normally', () => {
    renderEditor(formatParams, { fieldType: 'boolean' });

    expect(screen.getByTestId('colorEditorKeyBoolean 0')).toBeVisible();
  });

  it('should render other type normally (range field)', () => {
    renderEditor(formatParams, { fieldType: 'number' });

    expect(screen.getByTestId('colorEditorKeyRange 0')).toBeVisible();
  });

  it('should render multiple colors', () => {
    renderEditor({ colors: [...formatParams.colors, ...formatParams.colors] });

    expect(screen.getAllByTestId(/^colorEditorKeyPattern/)).toHaveLength(2);
    expect(screen.getAllByTestId('colorEditorRemoveColor')).toHaveLength(2);
    expect(screen.getAllByTestId('buttonColorSwatchIcon')).toHaveLength(4);
  });
});
