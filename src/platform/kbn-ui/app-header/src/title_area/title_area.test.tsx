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
import { TitleArea } from './title_area';
import { APP_HEADER_TEST_SUBJECTS } from '../test_subjects';

describe('TitleArea', () => {
  it('renders a placeholder in the title slot', () => {
    render(<TitleArea placeholder={<div data-test-subj="title-placeholder" />} />);

    expect(screen.getByTestId('title-placeholder')).toBeInTheDocument();
  });

  it('keeps the back button next to the placeholder', () => {
    render(
      <TitleArea back="/app/my-app" placeholder={<div data-test-subj="title-placeholder" />} />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.back)).toHaveAttribute(
      'href',
      '/app/my-app'
    );
    expect(screen.getByTestId('title-placeholder')).toBeInTheDocument();
  });

  it('prefers a real title over the placeholder', () => {
    render(
      <TitleArea title="Dashboards" placeholder={<div data-test-subj="title-placeholder" />} />
    );

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Dashboards');
    expect(screen.queryByTestId('title-placeholder')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no title, back, or placeholder', () => {
    const { container } = render(<TitleArea />);

    expect(container).toBeEmptyDOMElement();
  });
});
