/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import React from 'react';
import { ColorFormatEditor } from './color';
import { DEFAULT_CONVERTER_COLOR } from '@kbn/field-formats-plugin/common';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public/context';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { fireEvent, screen } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  context: jest.requireActual('@kbn/kibana-react-plugin/public/context').context,
}));

const fieldType = 'string';

const format = {
  convertToReact: jest.fn(),
};

const formatParams = {
  colors: [{ ...DEFAULT_CONVERTER_COLOR }],
};

const onChange = jest.fn();
const onError = jest.fn();

const fieldFormattersNumberDocLink =
  'https://www.elastic.co/docs/explore-analyze/numeral-formatting';

const docLinks = {
  links: {
    indexPatterns: {
      fieldFormattersNumber: fieldFormattersNumberDocLink,
    },
  },
} as CoreStart['docLinks'];

const KibanaReactContext = createKibanaReactContext({ docLinks });

const renderEditor = (params = formatParams, props: { fieldType?: string } = {}) =>
  renderWithI18n(
    <KibanaReactContext.Provider>
      <ColorFormatEditor
        fieldType={props.fieldType ?? fieldType}
        format={format as unknown as FieldFormat}
        formatParams={params}
        onChange={onChange}
        onError={onError}
      />
    </KibanaReactContext.Provider>
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

  it('should render the numeral pattern input only for number type', () => {
    const { unmount } = renderEditor();

    expect(screen.queryByTestId('colorEditorNumeralPattern')).not.toBeInTheDocument();
    unmount();

    renderEditor(formatParams, { fieldType: 'number' });

    expect(screen.getByTestId('colorEditorNumeralPattern')).toBeVisible();
    expect(screen.getByText('Documentation').closest('a')).toHaveAttribute(
      'href',
      fieldFormattersNumberDocLink
    );

    fireEvent.change(screen.getByTestId('colorEditorNumeralPattern'), {
      target: { value: '0.00' },
    });

    expect(onChange).toHaveBeenLastCalledWith({ ...formatParams, pattern: '0.00' });
  });

  it('should render multiple colors', () => {
    renderEditor({ colors: [...formatParams.colors, ...formatParams.colors] });

    expect(screen.getAllByTestId(/^colorEditorKeyPattern/)).toHaveLength(2);
    expect(screen.getAllByTestId('colorEditorRemoveColor')).toHaveLength(2);
    expect(screen.getAllByTestId('buttonColorSwatchIcon')).toHaveLength(4);
  });
});
