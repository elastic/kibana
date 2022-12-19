/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiButtonIconProps,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FilterEditorWrapper } from './filter_editor_wrapper';
import { popoverDragAndDropCss } from './add_filter_popover.styles';
import { CloseFilterEditorConfirmModal } from './close_filter_editor_confirm_modal';

export const strings = {
  getAddFilterButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterBar.addFilterButtonLabel', {
      defaultMessage: 'Add filter',
    }),
};

interface AddFilterPopoverProps {
  indexPatterns?: Array<DataView | string>;
  filters: Filter[];
  timeRangeForSuggestionsOverride?: boolean;
  onFiltersUpdated?: (filters: Filter[]) => void;
  isDisabled?: boolean;
  buttonProps?: Partial<EuiButtonIconProps>;
}

export const AddFilterPopover = React.memo(function AddFilterPopover({
  indexPatterns,
  filters,
  timeRangeForSuggestionsOverride,
  onFiltersUpdated,
  buttonProps,
  isDisabled,
}: AddFilterPopoverProps) {
  const euiTheme = useEuiTheme();
  const [showAddFilterPopover, setShowAddFilterPopover] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [shouldShowConfirmModalOnClosePopover, setShouldShowConfirmModalOnClosePopover] =
    useState(false);

  const onCancelModal = useCallback(() => {
    setShowConfirmModal(false);
  }, [setShowConfirmModal]);

  const onConfirmModal = useCallback(() => {
    setShowAddFilterPopover(false);
    setShowConfirmModal(false);
    setShouldShowConfirmModalOnClosePopover(false);
  }, [setShowAddFilterPopover, setShowConfirmModal, setShouldShowConfirmModalOnClosePopover]);

  const onCloseFilterPopover = useCallback(() => {
    if (shouldShowConfirmModalOnClosePopover) {
      setShowConfirmModal(true);
    } else {
      setShowAddFilterPopover(false);
    }
  }, [setShowConfirmModal, setShowAddFilterPopover, shouldShowConfirmModalOnClosePopover]);

  const button = (
    <EuiToolTip delay="long" content={strings.getAddFilterButtonLabel()}>
      <EuiButtonIcon
        display="base"
        iconType="plusInCircleFilled"
        aria-label={strings.getAddFilterButtonLabel()}
        data-test-subj="addFilter"
        onClick={() => setShowAddFilterPopover((isOpen) => !isOpen)}
        size="m"
        disabled={isDisabled}
        {...buttonProps}
        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
      />
    </EuiToolTip>
  );

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        id="addFilterPopover"
        button={button}
        isOpen={showAddFilterPopover}
        closePopover={() => {
          onCloseFilterPopover();
        }}
        anchorPosition="downLeft"
        panelPaddingSize="none"
        panelProps={{
          'data-test-subj': 'addFilterPopover',
          css: popoverDragAndDropCss(euiTheme),
        }}
        initialFocus=".filterEditor__hiddenItem"
        ownFocus
        repositionOnScroll
      >
        <FilterEditorWrapper
          indexPatterns={indexPatterns}
          filters={filters}
          timeRangeForSuggestionsOverride={timeRangeForSuggestionsOverride}
          onFiltersUpdated={onFiltersUpdated}
          setShouldShowConfirmModalOnClosePopover={setShouldShowConfirmModalOnClosePopover}
          closePopover={() => {
            onCloseFilterPopover();
          }}
        />
      </EuiPopover>
      {showConfirmModal && (
        <CloseFilterEditorConfirmModal onCancel={onCancelModal} onConfirm={onConfirmModal} />
      )}
    </EuiFlexItem>
  );
});
