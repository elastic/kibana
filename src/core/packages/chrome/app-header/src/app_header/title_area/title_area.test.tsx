/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { TitleArea } from './title_area';
import { APP_HEADER_TEST_SUBJECTS } from '../test_subjects';

const renderTitleArea = (ui: React.ReactElement) =>
  render(
    <ChromeServiceProvider value={{ chrome: chromeServiceMock.createStartContract() }}>
      {ui}
    </ChromeServiceProvider>
  );

describe('TitleArea', () => {
  it('renders a placeholder in the title slot', () => {
    renderTitleArea(<TitleArea placeholder={<div data-test-subj="title-placeholder" />} />);

    expect(screen.getByTestId('title-placeholder')).toBeInTheDocument();
  });

  it('keeps the back button next to the placeholder', () => {
    renderTitleArea(
      <TitleArea back="/app/my-app" placeholder={<div data-test-subj="title-placeholder" />} />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/my-app'
    );
    expect(screen.getByTestId('title-placeholder')).toBeInTheDocument();
  });

  it('prefers a real title over the placeholder', () => {
    renderTitleArea(
      <TitleArea title="Dashboards" placeholder={<div data-test-subj="title-placeholder" />} />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Dashboards');
    expect(screen.queryByTestId('title-placeholder')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no title, back, or placeholder', () => {
    const { container } = renderTitleArea(<TitleArea />);

    expect(container).toBeEmptyDOMElement();
  });
});
