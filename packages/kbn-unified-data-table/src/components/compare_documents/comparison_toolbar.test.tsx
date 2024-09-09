/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { renderComparisonToolbar } from './comparison_toolbar';

const renderToolbar = ({
  hasRoomForGridControls = true,
  totalFields = 2,
}: {
  hasRoomForGridControls?: boolean;
  totalFields?: number;
} = {}) => {
  const comparisonFields = ['field1', 'field2'];
  const ComparisonToolbar = renderComparisonToolbar({
    additionalControls: <div data-test-subj="additionalControls">additionalControls</div>,
    comparisonFields,
    totalFields,
  });
  render(
    <ComparisonToolbar
      hasRoomForGridControls={hasRoomForGridControls}
      keyboardShortcutsControl={
        <div data-test-subj="keyboardShortcutsControl">keyboardShortcutsControl</div>
      }
      fullScreenControl={<div data-test-subj="fullScreenControl">fullScreenControl</div>}
      columnControl={<div data-test-subj="columnControl">columnControl</div>}
      columnSortingControl={<div data-test-subj="columnSortingControl">columnSortingControl</div>}
      displayControl={<div data-test-subj="displayControl">displayControl</div>}
    />
  );
  return {
    getAdditionalControls: () => screen.queryByTestId('additionalControls'),
    getKeyboardShortcutsControl: () => screen.queryByTestId('keyboardShortcutsControl'),
    getFullScreenControl: () => screen.queryByTestId('fullScreenControl'),
    getDisplayControl: () => screen.queryByTestId('displayControl'),
    getColumnControl: () => screen.queryByTestId('columnControl'),
    getColumnSortingControl: () => screen.queryByTestId('columnSortingControl'),
    getComparisonLimitCallout: () =>
      screen.queryByText(
        `Comparison is limited to ${comparisonFields.length} of ${totalFields} fields.`
      ),
  };
};

describe('renderComparisonToolbar', () => {
  it('should render the toolbar', () => {
    const result = renderToolbar();
    expect(result.getAdditionalControls()).toBeInTheDocument();
    expect(result.getKeyboardShortcutsControl()).toBeInTheDocument();
    expect(result.getFullScreenControl()).toBeInTheDocument();
    expect(result.getDisplayControl()).toBeInTheDocument();
    expect(result.getColumnControl()).toBeInTheDocument();
    expect(result.getColumnSortingControl()).toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
    cleanup();
    const result2 = renderToolbar({ hasRoomForGridControls: false });
    expect(result2.getAdditionalControls()).toBeInTheDocument();
    expect(result2.getKeyboardShortcutsControl()).toBeInTheDocument();
    expect(result2.getFullScreenControl()).toBeInTheDocument();
    expect(result2.getDisplayControl()).toBeInTheDocument();
    expect(result2.getColumnControl()).not.toBeInTheDocument();
    expect(result2.getColumnSortingControl()).not.toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
  });

  it('should render comparison limited callout when totalFields is greater than comparisonFields', () => {
    const result = renderToolbar({ totalFields: 3 });
    expect(result.getComparisonLimitCallout()).toBeInTheDocument();
  });
});
