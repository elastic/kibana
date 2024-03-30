/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ComparisonControls, ComparisonControlsProps } from './comparison_controls';
import { DocumentDiffMode } from './types';

const renderComparisonControls = ({
  isPlainRecord = false,
  forceShowAllFields = false,
}: {
  isPlainRecord?: ComparisonControlsProps['isPlainRecord'];
  forceShowAllFields?: ComparisonControlsProps['forceShowAllFields'];
} = {}) => {
  const selectedDocs = ['0', '1', '2'];
  const Wrapper = () => {
    const [diffMode, setDiffMode] = useState<DocumentDiffMode>(null);
    const [showDiffDecorations, setShowDiffDecorations] = useState(true);
    const [showMatchingValues, setShowMatchingValues] = useState(true);
    const [showAllFields, setShowAllFields] = useState(true);
    const [isCompareActive, setIsCompareActive] = useState(true);
    return (
      <>
        {isCompareActive && <span>Comparison active</span>}
        <IntlProvider locale="en">
          <ComparisonControls
            isPlainRecord={isPlainRecord}
            selectedDocs={selectedDocs}
            diffMode={diffMode}
            showDiffDecorations={showDiffDecorations}
            showMatchingValues={showMatchingValues}
            showAllFields={showAllFields}
            forceShowAllFields={forceShowAllFields}
            setIsCompareActive={setIsCompareActive}
            setDiffMode={setDiffMode}
            setShowDiffDecorations={setShowDiffDecorations}
            setShowMatchingValues={setShowMatchingValues}
            setShowAllFields={setShowAllFields}
          />
        </IntlProvider>
      </>
    );
  };
  render(<Wrapper />);
  const getComparisonSettingsButton = () =>
    screen.getByRole('button', { name: 'Comparison settings' });
  const getDiffModeEntry = (mode: DocumentDiffMode) =>
    screen.getByTestId(`unifiedFieldListDiffMode-${mode ?? 'none'}`);
  const getShowAllFieldsSwitch = () =>
    screen.queryByTestId('unifiedFieldListDiffOptionSwitch-showAllFields');
  const getShowMatchingValuesSwitch = () =>
    screen.getByTestId('unifiedFieldListDiffOptionSwitch-showMatchingValues');
  const getShowDiffDecorationsSwitch = () =>
    screen.getByTestId('unifiedFieldListDiffOptionSwitch-showDiffDecorations');
  return {
    getComparisonCountDisplay: () =>
      screen.getByText(
        `Comparing ${selectedDocs.length} ${isPlainRecord ? 'results' : 'documents'}`
      ),
    getComparisonSettingsButton,
    clickComparisonSettingsButton: () => userEvent.click(getComparisonSettingsButton()),
    clickDiffModeFullValueButton: () =>
      userEvent.click(screen.getByRole('button', { name: 'Full value' }), undefined, {
        skipPointerEventsCheck: true,
      }),
    clickDiffModeByCharacterButton: () =>
      userEvent.click(screen.getByRole('button', { name: 'By character' }), undefined, {
        skipPointerEventsCheck: true,
      }),
    clickDiffModeByWordButton: () =>
      userEvent.click(screen.getByRole('button', { name: 'By word' }), undefined, {
        skipPointerEventsCheck: true,
      }),
    clickDiffModeByLineButton: () =>
      userEvent.click(screen.getByRole('button', { name: 'By line' }), undefined, {
        skipPointerEventsCheck: true,
      }),
    clickDiffModeNoneButton: () =>
      userEvent.click(screen.getByRole('button', { name: 'None' }), undefined, {
        skipPointerEventsCheck: true,
      }),
    diffModeIsSelected: (mode: DocumentDiffMode) =>
      getDiffModeEntry(mode).getAttribute('aria-current') === 'true',
    getAdvancedDiffModeBadge: (mode: DocumentDiffMode) =>
      within(getDiffModeEntry(mode)).queryByText('Advanced'),
    getShowAllFieldsSwitch,
    clickShowAllFieldsSwitch: () => {
      const fieldSwitch = getShowAllFieldsSwitch();
      if (fieldSwitch) {
        userEvent.click(fieldSwitch, undefined, {
          skipPointerEventsCheck: true,
        });
      }
    },
    getShowMatchingValuesSwitch,
    clickShowMatchingValuesSwitch: () =>
      userEvent.click(getShowMatchingValuesSwitch(), undefined, {
        skipPointerEventsCheck: true,
      }),
    getShowDiffDecorationsSwitch,
    clickShowDiffDecorationsSwitch: () =>
      userEvent.click(getShowDiffDecorationsSwitch(), undefined, {
        skipPointerEventsCheck: true,
      }),
    getExitComparisonButton: () => screen.getByRole('button', { name: 'Exit comparison mode' }),
    isCompareActive: () => screen.queryByText('Comparison active') !== null,
  };
};

describe('ComparisonControls', () => {
  it('should render', () => {
    const result = renderComparisonControls();
    expect(result.getComparisonCountDisplay()).toBeInTheDocument();
    expect(result.getComparisonSettingsButton()).toBeInTheDocument();
    expect(result.getExitComparisonButton()).toBeInTheDocument();
  });

  it('should render with isPlainRecord = true', () => {
    const result = renderComparisonControls({ isPlainRecord: true });
    expect(result.getComparisonCountDisplay()).toBeInTheDocument();
    expect(result.getComparisonSettingsButton()).toBeInTheDocument();
    expect(result.getExitComparisonButton()).toBeInTheDocument();
  });

  it('should allow changing diff mode', () => {
    const result = renderComparisonControls();
    result.clickComparisonSettingsButton();
    expect(result.diffModeIsSelected(null)).toBe(true);
    result.clickDiffModeFullValueButton();
    expect(result.diffModeIsSelected('basic')).toBe(true);
    result.clickDiffModeByCharacterButton();
    expect(result.diffModeIsSelected('chars')).toBe(true);
    result.clickDiffModeByWordButton();
    expect(result.diffModeIsSelected('words')).toBe(true);
    result.clickDiffModeByLineButton();
    expect(result.diffModeIsSelected('lines')).toBe(true);
    result.clickDiffModeNoneButton();
    expect(result.diffModeIsSelected(null)).toBe(true);
  });

  it('should allow toggling options', () => {
    const result = renderComparisonControls();
    result.clickComparisonSettingsButton();
    expect(result.getShowAllFieldsSwitch()).toBeChecked();
    expect(result.getShowMatchingValuesSwitch()).toBeChecked();
    expect(result.getShowDiffDecorationsSwitch()).toBeChecked();
    result.clickShowAllFieldsSwitch();
    expect(result.getShowAllFieldsSwitch()).not.toBeChecked();
    result.clickShowMatchingValuesSwitch();
    expect(result.getShowMatchingValuesSwitch()).not.toBeChecked();
    result.clickShowDiffDecorationsSwitch();
    expect(result.getShowDiffDecorationsSwitch()).not.toBeChecked();
  });

  it('should show advanced badge for advanced diff modes', () => {
    const result = renderComparisonControls();
    result.clickComparisonSettingsButton();
    expect(result.getAdvancedDiffModeBadge('basic')).not.toBeInTheDocument();
    expect(result.getAdvancedDiffModeBadge('chars')).toBeInTheDocument();
    expect(result.getAdvancedDiffModeBadge('words')).toBeInTheDocument();
    expect(result.getAdvancedDiffModeBadge('lines')).toBeInTheDocument();
  });

  it('should hide showAllFields switch when forceShowAllFields is true', () => {
    const result = renderComparisonControls({ forceShowAllFields: true });
    expect(result.getShowAllFieldsSwitch()).not.toBeInTheDocument();
  });

  it('should exit comparison mode', () => {
    const result = renderComparisonControls();
    expect(result.isCompareActive()).toBe(true);
    userEvent.click(result.getExitComparisonButton());
    expect(result.isCompareActive()).toBe(false);
  });
});
