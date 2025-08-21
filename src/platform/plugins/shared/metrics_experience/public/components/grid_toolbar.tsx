/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiButtonIcon,
  EuiPopover,
  EuiButtonGroup,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  setDraftSearchTerm,
  applySearchChanges,
  selectDraftSearchTerm,
  selectDimensions,
  setDimensions,
  selectValueFilters,
  setValueFilters,
  setDisplayDensity,
  selectDisplayDensity,
  selectIsFullscreen,
  toggleFullscreen,
} from '../store/slices';
import { DimensionsFilter } from './dimensions_filter';
import { ValuesFilter } from './values_filter';

interface GridToolbarProps {
  fields: Array<{
    name: string;
    index: string;
    dimensions: Array<{ name: string; type: string; description?: string }>;
  }>;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
  indices?: string[];
  timeRange?: {
    from?: string;
    to?: string;
  };
}

export const GridToolbar = ({ fields, indices, timeRange }: GridToolbarProps) => {
  // Get search state from Redux store
  const dispatch = useAppDispatch();
  const draftSearchTerm = useAppSelector(selectDraftSearchTerm);
  const dimensions = useAppSelector(selectDimensions);
  const valueFilters = useAppSelector(selectValueFilters);
  const displayDensity = useAppSelector(selectDisplayDensity);
  const isFullscreen = useAppSelector(selectIsFullscreen);

  // Get EUI theme for styling
  const { euiTheme } = useEuiTheme();

  // Local state for UI controls
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchInputElement, setSearchInputElement] = useState<HTMLInputElement | null>(null);
  const [isControlsPopoverOpen, setIsControlsPopoverOpen] = useState(false);

  // Auto-expand search if there's existing search text
  useEffect(() => {
    if (draftSearchTerm.length > 0) {
      setIsSearchExpanded(true);
    }
  }, [draftSearchTerm]);

  const handleDimensionChange = (nextDimensions: string[]) => {
    dispatch(setDimensions(nextDimensions));

    // If no dimensions are selected, clear all values
    if (nextDimensions.length === 0) {
      dispatch(setDimensions([]));
    } else {
      // Filter existing values to keep only those whose dimension is still selected
      const filteredValues = valueFilters.filter((selectedValue) => {
        const [field] = selectedValue.split(`${0x1d}`);
        return nextDimensions.includes(field);
      });
      dispatch(setValueFilters(filteredValues));
    }
  };

  const handleValueFiltersChange = (values: string[]) => {
    dispatch(setValueFilters(values));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    dispatch(setDraftSearchTerm(newValue));

    // If search is cleared, also clear dimension and value filters
    if (newValue === '') {
      dispatch(applySearchChanges());
    }
  };

  const handleSearchToggle = () => {
    setIsSearchExpanded(!isSearchExpanded);
    // Focus the input when expanding
    if (!isSearchExpanded) {
      setTimeout(() => {
        searchInputElement?.focus();
      }, 100);
    }
  };

  // Combined handler for applying changes (Redux + Zustand)
  const handleApplyChanges = () => {
    // Apply Redux search changes
    dispatch(applySearchChanges());
  };

  const handleSearchBlur = () => {
    // Only collapse if search is empty
    if (draftSearchTerm === '') {
      setIsSearchExpanded(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (draftSearchTerm === '') {
        setIsSearchExpanded(false);
      } else {
        // Clear search on ESC if there's content
        dispatch(setDraftSearchTerm(''));
        dispatch(setDimensions([]));
        dispatch(setValueFilters([]));
      }
    } else if (e.key === 'Enter') {
      // Apply changes when Enter is pressed
      handleApplyChanges();
    }
  };

  const handleControlsToggle = () => {
    setIsControlsPopoverOpen(!isControlsPopoverOpen);
  };

  const handleControlsClose = () => {
    setIsControlsPopoverOpen(false);
  };

  const handleFullscreenToggle = () => {
    dispatch(toggleFullscreen());
  };

  const onDensityChange = (optionId: string) => {
    dispatch(setDisplayDensity(optionId as 'normal' | 'compact' | 'row'));
  };

  // Display density options for the controls popover
  const densityOptions = [
    {
      id: 'normal',
      label: 'Normal',
    },
    {
      id: 'compact',
      label: 'Compact',
    },
    {
      id: 'row',
      label: 'Row',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween">
      {/* Left side - Filter buttons */}
      <EuiFlexItem grow={false}>
        <EuiFilterGroup compressed>
          <DimensionsFilter
            fields={fields}
            selectedDimensions={dimensions}
            onDimensionChange={handleDimensionChange}
            searchTerm={draftSearchTerm}
            onApplyChanges={handleApplyChanges}
          />
          {dimensions.length > 0 && (
            <ValuesFilter
              selectedDimensions={dimensions}
              selectedValues={valueFilters}
              onValueChange={handleValueFiltersChange}
              disabled={dimensions.length === 0}
              onApplyChanges={handleApplyChanges}
              indices={indices}
              timeRange={timeRange}
            />
          )}
        </EuiFilterGroup>
      </EuiFlexItem>

      {/* Right side - Controls and Search */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          {/* Search Field (when expanded) */}
          {isSearchExpanded && (
            <EuiFlexItem grow={false}>
              <EuiFieldSearch
                inputRef={setSearchInputElement}
                compressed
                placeholder="Search metrics..."
                value={draftSearchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                isClearable={true}
                style={{ width: '250px' }}
              />
            </EuiFlexItem>
          )}

          {/* Button Group */}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="none"
              style={{
                border: `1px solid ${euiTheme.border.color}`,
                borderRadius: euiTheme.border.radius.medium,
              }}
            >
              {/* Search */}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="search"
                  onClick={handleSearchToggle}
                  aria-label="Search metrics"
                  size="s"
                  color={draftSearchTerm.length > 0 ? 'primary' : 'text'}
                />
              </EuiFlexItem>

              {/* Controls Popover */}
              <EuiFlexItem
                grow={false}
                style={{ borderLeft: `1px solid ${euiTheme.border.color}` }}
              >
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      iconType="controls"
                      onClick={handleControlsToggle}
                      aria-label="Display controls"
                      size="s"
                      color="text"
                    />
                  }
                  isOpen={isControlsPopoverOpen}
                  closePopover={handleControlsClose}
                  anchorPosition="downRight"
                  panelPaddingSize="s"
                >
                  <EuiFlexGroup alignItems="center" style={{ width: '400px' }}>
                    <EuiFlexItem grow={0}>
                      <EuiText size="s" color="subdued">
                        <p>Display density</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiButtonGroup
                        legend="Display density selection"
                        options={densityOptions}
                        idSelected={displayDensity}
                        onChange={onDensityChange}
                        buttonSize="compressed"
                        isFullWidth={true}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPopover>
              </EuiFlexItem>

              {/* Fullscreen Toggle */}
              <EuiFlexItem
                grow={false}
                style={{ borderLeft: `1px solid ${euiTheme.border.color}` }}
              >
                <EuiButtonIcon
                  iconType={isFullscreen ? 'fullScreenExit' : 'fullScreen'}
                  onClick={handleFullscreenToggle}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  size="s"
                  color="text"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
