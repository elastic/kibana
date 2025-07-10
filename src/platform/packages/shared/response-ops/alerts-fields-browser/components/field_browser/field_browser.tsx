/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { debounce } from 'lodash';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import type { FieldBrowserProps } from '../../types';
import { FieldBrowserModal } from '../field_browser_modal/field_browser_modal';
import { filterBrowserFieldsByFieldName, filterSelectedBrowserFields } from '../../helpers';
import * as i18n from '../../translations';
import { styles } from './field_browser.styles';

const FIELDS_BUTTON_CLASS_NAME = 'fields-button';

/** wait this many ms after the user completes typing before applying the filter input */
export const INPUT_TIMEOUT = 250;

/**
 * Manages the state of the field browser
 */
export const FieldBrowserComponent: React.FC<FieldBrowserProps> = ({
  columnIds,
  browserFields,
  onResetColumns,
  onToggleColumn,
  options,
  width,
}) => {
  const initialCategories = useMemo(
    () => options?.preselectedCategoryIds ?? [],
    [options?.preselectedCategoryIds]
  );

  const customizeColumnsButtonRef = useRef<HTMLButtonElement | null>(null);
  /** all field names shown in the field browser must contain this string (when specified) */
  const [filterInput, setFilterInput] = useState('');
  /** debounced filterInput, the one that is applied to the filteredBrowserFields */
  const [appliedFilterInput, setAppliedFilterInput] = useState('');
  /** all fields in this collection have field names that match the filterInput */
  const [filteredBrowserFields, setFilteredBrowserFields] = useState<BrowserFields | null>(null);
  /** when true, show only the the selected field */
  const [filterSelectedEnabled, setFilterSelectedEnabled] = useState(false);
  /** when true, show a spinner in the input to indicate the field browser is searching for matching field names */
  const [isSearching, setIsSearching] = useState(false);
  /** this category will be displayed in the right-hand pane of the field browser */
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategories);
  /** show the field browser */
  const [show, setShow] = useState(false);

  // debounced function to apply the input filter
  // will delay the call to setAppliedFilterInput by INPUT_TIMEOUT ms
  // the parameter used will be the last one passed
  const debouncedApplyFilterInput = useMemo(
    () =>
      debounce((input: string) => {
        setAppliedFilterInput(input);
      }, INPUT_TIMEOUT),
    []
  );
  useEffect(() => {
    return () => {
      debouncedApplyFilterInput.cancel();
    };
  }, [debouncedApplyFilterInput]);

  const selectionFilteredBrowserFields = useMemo<BrowserFields>(
    () =>
      filterSelectedEnabled
        ? filterSelectedBrowserFields({ browserFields, columnIds })
        : browserFields,
    [browserFields, columnIds, filterSelectedEnabled]
  );

  useEffect(() => {
    setFilteredBrowserFields(
      filterBrowserFieldsByFieldName({
        browserFields: selectionFilteredBrowserFields,
        substring: appliedFilterInput,
      })
    );
    setIsSearching(false);
  }, [appliedFilterInput, selectionFilteredBrowserFields]);

  /** Shows / hides the field browser */
  const onShow = useCallback(() => {
    setShow(true);
  }, []);

  /** Invoked when the field browser should be hidden */
  const onHide = useCallback(() => {
    setFilterInput('');
    setAppliedFilterInput('');
    setFilteredBrowserFields(null);
    setFilterSelectedEnabled(false);
    setIsSearching(false);
    setSelectedCategoryIds(initialCategories);
    setShow(false);
  }, [initialCategories]);

  /** Invoked when the user types in the filter input */
  const updateFilter = useCallback(
    (newFilterInput: string) => {
      setIsSearching(true);
      setFilterInput(newFilterInput);
      debouncedApplyFilterInput(newFilterInput);
    },
    [debouncedApplyFilterInput]
  );

  /** Invoked when the user changes the view all/selected value  */
  const onFilterSelectedChange = useCallback(
    (filterSelected: boolean) => {
      setFilterSelectedEnabled(filterSelected);
    },
    [setFilterSelectedEnabled]
  );

  return (
    <div css={styles.buttonContainer} data-test-subj="fields-browser-button-container">
      <EuiToolTip content={i18n.FIELDS_BROWSER}>
        <EuiButtonEmpty
          aria-label={i18n.FIELDS_BROWSER}
          buttonRef={customizeColumnsButtonRef}
          className={FIELDS_BUTTON_CLASS_NAME}
          color="text"
          data-test-subj="show-field-browser"
          iconType="tableOfContents"
          onClick={onShow}
          size="xs"
        >
          {i18n.FIELDS}
        </EuiButtonEmpty>
      </EuiToolTip>

      {show && (
        <FieldBrowserModal
          columnIds={columnIds}
          filteredBrowserFields={
            filteredBrowserFields != null ? filteredBrowserFields : browserFields
          }
          filterSelectedEnabled={filterSelectedEnabled}
          isSearching={isSearching}
          setSelectedCategoryIds={setSelectedCategoryIds}
          onFilterSelectedChange={onFilterSelectedChange}
          onHide={onHide}
          onResetColumns={onResetColumns}
          onSearchInputChange={updateFilter}
          onToggleColumn={onToggleColumn}
          options={options}
          restoreFocusTo={customizeColumnsButtonRef}
          searchInput={filterInput}
          appliedFilterInput={appliedFilterInput}
          selectedCategoryIds={selectedCategoryIds}
          width={width}
        />
      )}
    </div>
  );
};

export const FieldBrowser = React.memo(FieldBrowserComponent);
