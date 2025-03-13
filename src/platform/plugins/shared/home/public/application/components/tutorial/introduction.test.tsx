/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { Introduction, IntroductionProps } from './introduction';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { TutorialsCategory } from '../../../../common/constants';

const basePathMock = httpServiceMock.createBasePath();

const commonProps: Omit<IntroductionProps, 'intl'> = {
  description: 'this is a great tutorial about...',
  title: 'Great tutorial',
  basePath: basePathMock,
};

describe('Introduction component', () => {
  test('renders with default props', () => {
    const { getByText } = render(
      <I18nProvider>
        <Introduction {...commonProps} />
      </I18nProvider>
    );
    expect(getByText('Great tutorial')).toBeInTheDocument();
    expect(getByText('this is a great tutorial about...')).toBeInTheDocument();
  });

  test('renders with iconType', () => {
    const { container } = render(
      <I18nProvider>
        <Introduction {...commonProps} iconType="logoElastic" />
      </I18nProvider>
    );

    const icon = container.querySelector('[data-euiicon-type="logoElastic"]');
    expect(icon).toBeInTheDocument();
  });

  test('renders with exportedFieldsUrl', () => {
    const { getByRole } = render(
      <I18nProvider>
        <Introduction {...commonProps} exportedFieldsUrl="exported_fields_url" />
      </I18nProvider>
    );

    const anchorElement = getByRole('link', {
      name: 'View exported fields (external, opens in a new tab or window)',
    });
    expect(anchorElement).toHaveAttribute('href', 'exported_fields_url');
  });

  test('renders with previewUrl', () => {
    const { getByRole } = render(
      <I18nProvider>
        <Introduction {...commonProps} previewUrl="preview_image_url" />
      </I18nProvider>
    );
    const image = getByRole('img', { name: 'screenshot of primary dashboard.' });
    expect(image).toHaveAttribute('src', 'preview_image_url');
  });

  test('isBeta', () => {
    const { getByText } = render(
      <I18nProvider>
        <Introduction {...commonProps} isBeta={true} />
      </I18nProvider>
    );
    expect(getByText('Beta')).toBeInTheDocument();
  });

  test('Beats badge should show', () => {
    const { getByText } = render(
      <I18nProvider>
        <Introduction {...commonProps} isBeta={true} category={TutorialsCategory.METRICS} />
      </I18nProvider>
    );
    expect(getByText('Beats')).toBeInTheDocument();
  });

  test('Beats badge should not show', () => {
    const { queryByText } = render(
      <I18nProvider>
        <Introduction {...commonProps} category={TutorialsCategory.SECURITY_SOLUTION} />
      </I18nProvider>
    );
    expect(queryByText('Beats')).not.toBeInTheDocument();
  });
});
