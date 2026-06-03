/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import { BytesFormatEditor } from './bytes';
import { createFieldFormatMock } from '../test_utils';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public/context';
import { formatId } from './constants';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  context: jest.requireActual('@kbn/kibana-react-plugin/public/context').context,
}));

const fieldType = 'number';

const format = createFieldFormatMock({
  getParamDefaults: jest.fn().mockImplementation(() => ({ pattern: '0,0.[000]b' })),
  convertToReact: jest.fn().mockImplementation((input: number) => input * 2),
});

const formatParams = {
  pattern: '',
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

const renderBytesFormatEditor = () =>
  renderWithI18n(
    <KibanaReactContext.Provider>
      <BytesFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    </KibanaReactContext.Provider>
  );

describe('BytesFormatEditor', () => {
  it('should have a formatId', () => {
    expect(BytesFormatEditor.formatId).toEqual(formatId);
  });

  it('should render normally', () => {
    renderBytesFormatEditor();

    expect(screen.getByLabelText(/Numeral\.js format pattern/)).toBeVisible();
    expect(screen.getByText('0,0.[000]b')).toBeVisible();
    expect(screen.getByText('Documentation')).toBeVisible();
    expect(screen.getByText('Documentation').closest('a')).toHaveAttribute(
      'href',
      fieldFormattersNumberDocLink
    );
    expect(screen.getByText('256')).toBeVisible();
    expect(screen.getByText('512')).toBeVisible();
  });
});
