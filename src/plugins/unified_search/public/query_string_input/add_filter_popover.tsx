/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiButtonIcon, EuiPopover, EuiButtonIconProps } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { IIndexPattern } from '../../../data/public';
import { FilterEditorWrapper } from './filter_editor_wrapper';

interface AddFilterPopoverProps {
  indexPatterns?: Array<IIndexPattern | string>;
  filters: Filter[];
  timeRangeForSuggestionsOverride?: boolean;
  onFiltersUpdated?: (filters: Filter[]) => void;
  buttonProps?: Partial<EuiButtonIconProps>;
}

export const AddFilterPopover = React.memo(function AddFilterPopover({
  indexPatterns,
  filters,
  timeRangeForSuggestionsOverride,
  onFiltersUpdated,
  buttonProps,
}: AddFilterPopoverProps) {
  const [isAddFilterPopoverOpen, setIsAddFilterPopoverOpen] = useState(false);

  const button = (
    <EuiButtonIcon
      display="base"
      iconType="plusInCircleFilled"
      aria-label={i18n.translate('unifiedSearch.filter.filterBar.addFilterButtonLabel', {
        defaultMessage: 'Add filter',
      })}
      data-test-subj="addFilter"
      onClick={() => setIsAddFilterPopoverOpen(!isAddFilterPopoverOpen)}
      size="m"
      {...buttonProps}
    />
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id="addFilterPopover"
        button={button}
        isOpen={isAddFilterPopoverOpen}
        closePopover={() => setIsAddFilterPopoverOpen(false)}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        initialFocus=".filterEditor__hiddenItem"
        ownFocus
        repositionOnScroll
      >
        <FilterEditorWrapper
          indexPatterns={indexPatterns}
          filters={filters}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          onFiltersUpdated={onFiltersUpdated}
          closePopover={() => setIsAddFilterPopoverOpen(false)}
        />
      </EuiPopover>
    </EuiFlexItem>
  );
});
