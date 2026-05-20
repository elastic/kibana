/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css, Global } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { DraggableItem } from './draggable_item';
import { HiddenItemsSection } from './hidden_items_section';
import { SpaceCallout } from './space_callout';
import { useItemList } from './use_item_list';
import type { NavigationItemInfo } from '../types';

const modalCss = css`
  width: 576px;
`;

const headerCss = (euiTheme: EuiThemeComputed) => css`
  padding-bottom: ${euiTheme.size.s};
`;

interface Props {
  items: NavigationItemInfo[];
  isCalloutDismissed: boolean;
  onSave: (order: string[], hiddenIds: string[]) => void;
  onReset: () => NavigationItemInfo[];
  onChange: (order: string[], hiddenIds: string[]) => void;
  onClose: () => void;
  onDismissCallout: () => void;
}

export const CustomizeNavigationModal = ({
  items: initialItems,
  isCalloutDismissed,
  onSave,
  onReset,
  onChange,
  onClose,
  onDismissCallout,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const {
    items,
    setItems,
    visibleItems,
    hiddenItems,
    hasChanges,
    createDragEndHandler,
    toggleItemVisibility,
  } = useItemList(initialItems);

  const [isSaving, setIsSaving] = useState(false);
  const [calloutDismissed, setCalloutDismissed] = useState(isCalloutDismissed);

  const handleDismissCallout = useCallback(() => {
    setCalloutDismissed(true);
    onDismissCallout();
  }, [onDismissCallout]);

  useEffect(() => {
    const order = items.map((item) => item.id);
    const hiddenIds = items.filter((item) => item.hidden).map((item) => item.id);
    onChange(order, hiddenIds);
  }, [items, onChange]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    setIsSaving(true);

    const order = items.map((item) => item.id);
    const hiddenIds = items.filter((item) => item.hidden).map((item) => item.id);
    onSave(order, hiddenIds);

    setIsSaving(false);
  }, [items, onSave]);

  const handleReset = useCallback(() => {
    setItems(onReset());
  }, [onReset, setItems]);

  return (
    <EuiModal
      onClose={handleClose}
      aria-labelledby={modalTitleId}
      css={modalCss}
      data-test-subj="customizeNavigationModal"
    >
      <Global
        styles={{
          '.euiOverlayMask:has([data-test-subj="customizeNavigationModal"])': {
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      <EuiModalHeader css={headerCss(euiTheme)}>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="navigationCustomizationComponents.modalTitle"
            defaultMessage="Customize Navigation"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiDragDropContext onDragEnd={createDragEndHandler('visible')}>
          <EuiDroppable droppableId="nav-items" spacing="none">
            {visibleItems.map((item, index) => (
              <DraggableItem
                key={item.id}
                item={item}
                index={index}
                toggleItemVisibility={toggleItemVisibility}
              />
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiSpacer size="s" />
        <HiddenItemsSection
          items={hiddenItems}
          onDragEnd={createDragEndHandler('hidden')}
          toggleItemVisibility={toggleItemVisibility}
        />
        {!calloutDismissed && <SpaceCallout onDismissCallout={handleDismissCallout} />}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="undo"
              color="danger"
              onClick={handleReset}
              disabled={isSaving}
            >
              <FormattedMessage
                id="navigationCustomizationComponents.resetButtonText"
                defaultMessage="Reset to default"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false}>
              {hasChanges && (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={handleClose}>
                    <FormattedMessage
                      id="navigationCustomizationComponents.cancelButtonText"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={!hasChanges}
                  data-test-subj="customizeNavigationSaveButton"
                >
                  <FormattedMessage
                    id="navigationCustomizationComponents.applyButtonText"
                    defaultMessage="Apply"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
