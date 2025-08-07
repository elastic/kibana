/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { ColorFormatEditor } from './color';
import { FieldFormat, DEFAULT_CONVERTER_COLOR } from '@kbn/field-formats-plugin/common';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn(),
};
const formatParams = {
  colors: [{ ...DEFAULT_CONVERTER_COLOR }],
};
const onChange = jest.fn();
const onError = jest.fn();

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      {component}
    </IntlProvider>
  );
};

describe('ColorFormatEditor', () => {
  it('should have a formatId', () => {
    expect(ColorFormatEditor.formatId).toEqual('color');
  });

  it('renders the color swatch icon inside the button', () => {
    renderWithIntl(
      <ColorFormatEditor
        fieldType={'color'}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    const buttons = screen.getAllByTestId('buttonColorSwatchIcon');
    expect(buttons).toHaveLength(2); // One for text color, one for background color
    expect(buttons[0]).toBeInTheDocument();
    expect(buttons[1]).toBeInTheDocument();
  });

  it('should render string type normally (regex field)', async () => {
    const { container } = renderWithIntl(
      <ColorFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render boolean type normally', async () => {
    const { container } = renderWithIntl(
      <ColorFormatEditor
        fieldType={'boolean'}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render other type normally (range field)', async () => {
    const { container } = renderWithIntl(
      <ColorFormatEditor
        fieldType={'number'}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render multiple colors', async () => {
    const { container } = renderWithIntl(
      <ColorFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={{ colors: [...formatParams.colors, ...formatParams.colors] }}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
