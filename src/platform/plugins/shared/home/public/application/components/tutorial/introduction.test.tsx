/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { Introduction } from './introduction';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { TutorialsCategory } from '../../../../common/constants';

const basePathMock = httpServiceMock.createBasePath();

test('render', () => {
  const component = render(
    <IntlProvider>
      <Introduction
        description="this is a great tutorial about..."
        title="Great tutorial"
        basePath={basePathMock}
      />
    </IntlProvider>
  );
  expect(component).toMatchSnapshot();
});

describe('props', () => {
  test('iconType', () => {
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          iconType="logoElastic"
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('exportedFieldsUrl', () => {
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          exportedFieldsUrl="exported_fields_url"
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('previewUrl', () => {
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          previewUrl="preview_image_url"
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('isBeta', () => {
    // are we going to use isBeta in the end?
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          isBeta={true}
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('Beats badge should show', () => {
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          isBeta={true}
          category={TutorialsCategory.METRICS}
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });

  test('Beats badge should not show', () => {
    const component = render(
      <IntlProvider>
        <Introduction
          description="this is a great tutorial about..."
          title="Great tutorial"
          basePath={basePathMock}
          isBeta={true}
          category={TutorialsCategory.SECURITY_SOLUTION}
        />
      </IntlProvider>
    );
    expect(component).toMatchSnapshot();
  });
});
/* This test file has 2 console warnings, but both belong to eui dom elements structure.
Because we use  EuiPageHeader - description (which is a <p></p> and then passing divs inside) and another has similar logic */
