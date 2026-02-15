/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { CONTENT_TEST_ID, ExpandableSection, HEADER_TEST_ID } from './expandable_section';

const title = <p>{'title'}</p>;
const children = <div>{'content'}</div>;
const testId = 'test';
const headerTestId = testId + HEADER_TEST_ID;
const contentTestId = testId + CONTENT_TEST_ID;

const renderExpandableSection = (expanded: boolean) =>
  render(
    <ExpandableSection expanded={expanded} title={title} data-test-subj={testId}>
      {children}
    </ExpandableSection>
  );

describe('<ExpandableSection />', () => {
  it('should render ExpandableSection component', () => {
    const { getByTestId } = renderExpandableSection(false);

    expect(getByTestId(headerTestId)).toHaveTextContent('title');
    expect(getByTestId(contentTestId)).toBeInTheDocument();
  });

  it('should render the component collapsed', () => {
    const { getByTestId } = renderExpandableSection(false);

    expect(getByTestId(contentTestId)).not.toBeVisible();
  });

  it('should render the component expanded', () => {
    const { getByTestId } = renderExpandableSection(true);

    expect(getByTestId(contentTestId)).toBeVisible();
  });

  it('should expand the component when clicking on the arrow on header', async () => {
    const { getByTestId } = renderExpandableSection(false);

    await act(async () => {
      getByTestId(headerTestId).click();
      expect(getByTestId(contentTestId)).toBeInTheDocument();
    });
  });
});
