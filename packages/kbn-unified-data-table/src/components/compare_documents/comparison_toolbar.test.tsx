/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cleanup, render, screen } from '@testing-library/react';
import React from 'react';
import { renderComparisonToolbar } from './comparison_toolbar';

const renderToolbar = ({
  hasRoomForGridControls = true,
  renderCustomToolbar,
  totalFields = 2,
}: {
  hasRoomForGridControls?: boolean;
  renderCustomToolbar?: boolean;
  totalFields?: number;
} = {}) => {
  const comparisonFields = ['field1', 'field2'];
  const ComparisonToolbar = renderComparisonToolbar({
    renderCustomToolbar: renderCustomToolbar
      ? ({ toolbarProps, gridProps }) => (
          <div data-test-subj="renderCustomToolbar">
            {gridProps.additionalControls}
            {toolbarProps.hasRoomForGridControls && (
              <>
                {toolbarProps.keyboardShortcutsControl}
                {toolbarProps.fullScreenControl}
                {toolbarProps.columnControl}
                {toolbarProps.columnSortingControl}
                {toolbarProps.displayControl}
              </>
            )}
          </div>
        )
      : undefined,
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
    getCustomToolbar: () => screen.queryByTestId('renderCustomToolbar'),
    getAdditionalControls: () => screen.queryByTestId('additionalControls'),
    getKeyboardShortcutsControl: () => screen.queryByTestId('keyboardShortcutsControl'),
    getFullScreenControl: () => screen.queryByTestId('fullScreenControl'),
    getColumnControl: () => screen.queryByTestId('columnControl'),
    getColumnSortingControl: () => screen.queryByTestId('columnSortingControl'),
    getDisplayControl: () => screen.queryByTestId('displayControl'),
    getComparisonLimitCallout: () =>
      screen.queryByText(
        `Comparison is limited to ${comparisonFields.length} of ${totalFields} fields.`
      ),
  };
};

describe('renderComparisonToolbar', () => {
  it('should render the default toolbar', () => {
    const result = renderToolbar();
    expect(result.getCustomToolbar()).not.toBeInTheDocument();
    expect(result.getAdditionalControls()).toBeInTheDocument();
    expect(result.getKeyboardShortcutsControl()).toBeInTheDocument();
    expect(result.getFullScreenControl()).toBeInTheDocument();
    expect(result.getColumnControl()).not.toBeInTheDocument();
    expect(result.getColumnSortingControl()).not.toBeInTheDocument();
    expect(result.getDisplayControl()).not.toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
    cleanup();
    const result2 = renderToolbar({ hasRoomForGridControls: false });
    expect(result2.getCustomToolbar()).not.toBeInTheDocument();
    expect(result2.getAdditionalControls()).toBeInTheDocument();
    expect(result2.getKeyboardShortcutsControl()).not.toBeInTheDocument();
    expect(result2.getFullScreenControl()).not.toBeInTheDocument();
    expect(result2.getColumnControl()).not.toBeInTheDocument();
    expect(result2.getColumnSortingControl()).not.toBeInTheDocument();
    expect(result2.getDisplayControl()).not.toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
  });

  it('should render a custom toolbar', () => {
    const result = renderToolbar({ renderCustomToolbar: true });
    expect(result.getCustomToolbar()).toBeInTheDocument();
    expect(result.getAdditionalControls()).toBeInTheDocument();
    expect(result.getKeyboardShortcutsControl()).toBeInTheDocument();
    expect(result.getFullScreenControl()).toBeInTheDocument();
    expect(result.getColumnControl()).toBeInTheDocument();
    expect(result.getColumnSortingControl()).toBeInTheDocument();
    expect(result.getDisplayControl()).toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
    cleanup();
    const result2 = renderToolbar({ renderCustomToolbar: true, hasRoomForGridControls: false });
    expect(result2.getCustomToolbar()).toBeInTheDocument();
    expect(result2.getAdditionalControls()).toBeInTheDocument();
    expect(result2.getKeyboardShortcutsControl()).not.toBeInTheDocument();
    expect(result2.getFullScreenControl()).not.toBeInTheDocument();
    expect(result2.getColumnControl()).not.toBeInTheDocument();
    expect(result2.getColumnSortingControl()).not.toBeInTheDocument();
    expect(result2.getDisplayControl()).not.toBeInTheDocument();
    expect(result.getComparisonLimitCallout()).not.toBeInTheDocument();
  });

  it('should render comparison limited callout when totalFields is greater than comparisonFields', () => {
    const result = renderToolbar({ totalFields: 3 });
    expect(result.getComparisonLimitCallout()).toBeInTheDocument();
    cleanup();
    const result2 = renderToolbar({ totalFields: 3, renderCustomToolbar: true });
    expect(result2.getComparisonLimitCallout()).toBeInTheDocument();
  });
});
