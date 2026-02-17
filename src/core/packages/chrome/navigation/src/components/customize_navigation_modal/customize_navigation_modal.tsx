/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  EuiTitle,
  euiDragDropReorder,
  useGeneratedHtmlId,
  type DropResult,
} from '@elastic/eui';
import type {
  SolutionId,
  NavigationItemInfo,
  NavigationCustomization,
} from '@kbn/core-chrome-browser';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LockedItem } from './locked_item';
import { DraggableItem } from './draggable_item';


export interface CustomizeNavigationModalProps {
  solutionId: SolutionId;
  onClose: () => void;
  getNavigationPrimaryItems: () => NavigationItemInfo[];
  setNavigationCustomization: (
    id: SolutionId,
    customization: NavigationCustomization | undefined
  ) => void;
  setIsEditingNavigation: (isEditing: boolean) => void;
}

export const CustomizeNavigationModal = ({
  solutionId,
  onClose,
  getNavigationPrimaryItems,
  setNavigationCustomization,
  setIsEditingNavigation,
}: CustomizeNavigationModalProps) => {
  const [items, setItems] = useState<NavigationItemInfo[]>(() => getNavigationPrimaryItems());
  const [isSaving, setIsSaving] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const modalCss = css`
    width: 576px;
  `;

  // Enable editing mode
  useEffect(() => {
    setIsEditingNavigation(true);
    return () => setIsEditingNavigation(false);
  }, [setIsEditingNavigation]);

  const lockedItems = useMemo(() => items.filter((item) => item.locked), [items]);
  const visibleItems = useMemo(
    () => items.filter((item) => !item.locked && !item.hidden),
    [items]
  );
  const hiddenItems = useMemo(
    () => items.filter((item) => !item.locked && item.hidden),
    [items]
  );

  // Send live preview to nav when items change (not persisted while editing)
  useEffect(() => {
    const order = items.map((item) => item.id);
    const hiddenIds = items.filter((item) => item.hidden).map((item) => item.id);
    setNavigationCustomization(solutionId, { order, hiddenIds });
  }, [items, setNavigationCustomization, solutionId]);

  const handleClose = useCallback(() => {
    // Exit editing mode (reverts to persisted state)
    setIsEditingNavigation(false);
    onClose();
  }, [onClose, setIsEditingNavigation]);

  const onVisibleDragEnd = useCallback(({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return;

    setItems((prev) => {
      const locked = prev.filter((item) => item.locked);
      const visible = prev.filter((item) => !item.locked && !item.hidden);
      const hidden = prev.filter((item) => !item.locked && item.hidden);
      const reordered = euiDragDropReorder(visible, source.index, destination.index);
      return [...locked, ...reordered, ...hidden];
    });
  }, []);

  const onHiddenDragEnd = useCallback(({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return;

    setItems((prev) => {
      const locked = prev.filter((item) => item.locked);
      const visible = prev.filter((item) => !item.locked && !item.hidden);
      const hidden = prev.filter((item) => !item.locked && item.hidden);
      const reordered = euiDragDropReorder(hidden, source.index, destination.index);
      return [...locked, ...visible, ...reordered];
    });
  }, []);

  const toggleItemVisibility = useCallback((itemId: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === itemId);
      if (idx === -1) return prev;

      const item = prev[idx];
      const nowHidden = !item.hidden;
      const updatedItem = { ...item, hidden: nowHidden };
      const rest = [...prev.slice(0, idx), ...prev.slice(idx + 1)];

      const locked = rest.filter((i) => i.locked);
      const reorderable = rest.filter((i) => !i.locked);
      const visible = reorderable.filter((i) => !i.hidden);
      const hidden = reorderable.filter((i) => i.hidden);

      if (nowHidden) {
        // Turned off → move to the bottom (end of hidden group)
        return [...locked, ...visible, ...hidden, updatedItem];
      }
      // Turned on → move to end of visible group (above hidden items)
      return [...locked, ...visible, updatedItem, ...hidden];
    });
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);

    // Exit editing mode first so the customization gets persisted
    setIsEditingNavigation(false);

    const order = items.map((item) => item.id);
    const hiddenIds = items.filter((item) => item.hidden).map((item) => item.id);
    setNavigationCustomization(solutionId, { order, hiddenIds });

    setIsSaving(false);
    onClose();
  }, [items, solutionId, onClose, setNavigationCustomization, setIsEditingNavigation]);

  const handleReset = useCallback(() => {
    // Reset to defaults (persist) and refresh items
    setNavigationCustomization(solutionId, undefined);
    setItems(getNavigationPrimaryItems());
  }, [solutionId, setNavigationCustomization, getNavigationPrimaryItems]);

  return (
    <EuiModal onClose={handleClose} aria-labelledby={modalTitleId} css={modalCss}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="core.ui.chrome.sideNavigation.customizeNavigation.modalTitle"
            defaultMessage="Customize Navigation"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <>
          {lockedItems.length > 0 && (
            <>
              {lockedItems.map((item) => (
                <LockedItem key={item.id} item={item} />
              ))}
            </>
          )}
          <EuiDragDropContext onDragEnd={onVisibleDragEnd}>
            <EuiDroppable droppableId="visible-nav-items" spacing="none">
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
          {hiddenItems.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <EuiTitle size="xxs">
                <h4>
                  <FormattedMessage
                    id="core.ui.chrome.sideNavigation.customizeNavigation.moreLabel"
                    defaultMessage="Always under More"
                  />
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiDragDropContext onDragEnd={onHiddenDragEnd}>
                <EuiDroppable droppableId="hidden-nav-items" spacing="none">
                  {hiddenItems.map((item, index) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      index={index}
                      toggleItemVisibility={toggleItemVisibility}
                    />
                  ))}
                </EuiDroppable>
              </EuiDragDropContext>
            </>
          )}
        </>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              color="danger"
              onClick={handleReset}
              disabled={isSaving}
            >
              <FormattedMessage
                id="core.ui.chrome.sideNavigation.customizeNavigation.resetButtonText"
                defaultMessage="Reset"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isSaving}
              data-test-subj="customizeNavigationSaveButton"
            >
              <FormattedMessage
                id="core.ui.chrome.sideNavigation.customizeNavigation.applyButtonText"
                defaultMessage="Apply"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
