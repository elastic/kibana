/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ResizableContainer } from './resizable_container';
import { Panel } from '../types';
import { useExpandableFlyoutState } from '../..';
import {
  RESIZABLE_BUTTON_TEST_ID,
  RESIZABLE_LEFT_SECTION_TEST_ID,
  RESIZABLE_RIGHT_SECTION_TEST_ID,
} from './test_ids';

const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];
const defaultLeftSectionWidth = 500;
const defaultRightSectionWidth = 300;

describe('ResizableContainer', () => {
  it('should render back button and close button in header', () => {
    (useExpandableFlyoutState as jest.Mock).mockReturnValue({
      right: { id: 'key' },
      left: { id: 'key' },
      preview: [{ id: 'key' }],
    });

    const { getByTestId } = render(
      <ResizableContainer
        registeredPanels={registeredPanels}
        defaultLeftSectionWidth={defaultLeftSectionWidth}
        defaultRightSectionWidth={defaultRightSectionWidth}
      />
    );

    expect(getByTestId(RESIZABLE_LEFT_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESIZABLE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(RESIZABLE_RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
  });
});
