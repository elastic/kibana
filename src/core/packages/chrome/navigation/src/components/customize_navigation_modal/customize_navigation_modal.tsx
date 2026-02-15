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
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  euiDragDropReorder,
  useGeneratedHtmlId,
  type DropResult,
} from '@elastic/eui';
import type { SolutionId, NavigationItemInfo, NavigationOrdering } from '@kbn/core-chrome-browser';
import type { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LockedItem } from './locked_item';
import { DraggableItem } from './draggable_item';

export interface CustomizeNavigationModalProps {
  solutionId: SolutionId;
  onClose: () => void;
  getNavigationItems$: () => Observable<NavigationItemInfo[]>;
  setNavigationOrdering: (id: SolutionId, ordering: NavigationOrdering | undefined) => void;
  /** Optional callback for live preview - updates nav without persisting */
  onPreview?: (ordering: NavigationOrdering) => void;
  /** Optional callback to cancel live preview - reverts to persisted state */
  onCancelPreview?: () => void;
}

export const CustomizeNavigationModal = ({
  solutionId,
  onClose,
  getNavigationItems$,
  setNavigationOrdering,
  onPreview,
  onCancelPreview,
}: CustomizeNavigationModalProps) => {
  const initialItems = useObservable(useMemo(() => getNavigationItems$(), [getNavigationItems$]));
  const [localItems, setLocalItems] = useState<NavigationItemInfo[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const modalCss = css`
    width: 576px;
  `;

  // Initialize local items from observed items once
  const items = useMemo(() => localItems ?? initialItems ?? [], [localItems, initialItems]);
  const isLoading = !initialItems;

  // Copy initial items to local state for editing when they first load
  useEffect(() => {
    if (initialItems && !localItems) {
      setLocalItems(initialItems);
    }
  }, [initialItems, localItems]);

  const lockedItems = useMemo(() => items.filter((item) => item.locked), [items]);
  const reorderableItems = useMemo(() => items.filter((item) => !item.locked), [items]);

  // Send live preview to nav when items change
  useEffect(() => {
    if (!localItems || !onPreview) return;

    const order = localItems.map((item) => item.id);
    const hiddenIds = localItems.filter((item) => item.hidden).map((item) => item.id);
    onPreview({ order, hiddenIds });
  }, [localItems, onPreview]);

  const handleClose = useCallback(() => {
    onCancelPreview?.();
    onClose();
  }, [onClose, onCancelPreview]);

  const onDragEnd = useCallback(({ source, destination }: DropResult) => {
    if (!destination || source.index === destination.index) return;

    setLocalItems((prev) => {
      if (!prev) return prev;
      const locked = prev.filter((item) => item.locked);
      const reorderable = prev.filter((item) => !item.locked);
      const reordered = euiDragDropReorder(reorderable, source.index, destination.index);
      return [...locked, ...reordered];
    });
  }, []);

  const toggleItemVisibility = useCallback((itemId: string) => {
    setLocalItems(
      (prev) =>
        prev?.map((item) => (item.id === itemId ? { ...item, hidden: !item.hidden } : item)) ?? null
    );
  }, []);

  const handleSave = useCallback(() => {
    setIsSaving(true);

    const order = items.map((item) => item.id);
    const hiddenIds = items.filter((item) => item.hidden).map((item) => item.id);

    setNavigationOrdering(solutionId, { order, hiddenIds });
    setIsSaving(false);
    onClose();
  }, [items, solutionId, onClose, setNavigationOrdering]);

  const handleReset = useCallback(() => {
    onCancelPreview?.(); // Revert preview before resetting
    setNavigationOrdering(solutionId, undefined);
    onClose();
  }, [solutionId, onClose, setNavigationOrdering, onCancelPreview]);

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
        {isLoading ? (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <>
            {lockedItems.length > 0 && (
              <>
                {lockedItems.map((item) => (
                  <LockedItem key={item.id} item={item} />
                ))}
              </>
            )}
            <EuiDragDropContext onDragEnd={onDragEnd}>
              <EuiDroppable droppableId="nav-items" spacing="none">
                {reorderableItems.map((item, index) => (
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
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              color="danger"
              onClick={handleReset}
              disabled={isLoading || isSaving}
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
              disabled={isLoading}
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
