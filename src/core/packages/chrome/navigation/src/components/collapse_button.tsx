/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  EuiCheckbox,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  euiDragDropReorder,
} from '@elastic/eui';
import type { DropResult } from '@hello-pangea/dnd';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { PRIMARY_NAVIGATION_ID } from '../constants';
import type { MenuItem } from '../../types';
import type { IconType } from '@elastic/eui';

interface NavItemConfig {
  id: string;
  label: string;
  iconType: IconType;
  visible: boolean;
  isLocked: boolean;
}

interface Props {
  isCollapsed: boolean;
  showLabels: boolean;
  showSecondaryPanel: boolean;
  primaryItems: MenuItem[];
  toggle: (isCollapsed: boolean) => void;
  onSetShowLabels: (showLabels: boolean) => void;
  onSetShowSecondaryPanel: (showSecondaryPanel: boolean) => void;
  onSetNavItemsOrder?: (itemIds: string[]) => void;
  onSetNavItemVisibility?: (itemId: string, visible: boolean) => void;
}

const sideNavCollapseButtonStyles = (euiTheme: UseEuiTheme['euiTheme']) => {
  return {
    sideNavCollapseButtonWrapper: css`
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: ${euiTheme.size.xxl};
    `,
    sideNavCollapseButton: css`
      &.euiButtonIcon:hover {
        transform: none;
      }
    `,
  };
};

/**
 * Button for the side navigation that opens a modal
 */
export const SideNavCollapseButton: FC<Props> = ({
  isCollapsed,
  showLabels,
  showSecondaryPanel,
  primaryItems,
  toggle,
  onSetShowLabels,
  onSetShowSecondaryPanel,
  onSetNavItemsOrder,
  onSetNavItemVisibility,
}) => {
  const iconType = 'brush';
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => sideNavCollapseButtonStyles(euiTheme), [euiTheme]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determine locked items (first 2: Discover and Dashboards)
  const LOCKED_IDS = ['discover', 'dashboards'];
  const NAV_ITEMS_ORDER_KEY = 'core.chrome.sideNav.itemsOrder';
  const NAV_ITEMS_VISIBILITY_KEY = 'core.chrome.sideNav.itemsVisibility';
  const isLocked = useCallback((id: string) => LOCKED_IDS.includes(id.toLowerCase()), []);

  // Initialize nav items config from primaryItems with saved preferences
  const [navItemsConfig, setNavItemsConfig] = useState<NavItemConfig[]>(() => {
    // Load saved order and visibility from localStorage
    let savedOrder: string[] = [];
    let savedVisibility: Record<string, boolean> = {};
    
    try {
      const orderStr = localStorage.getItem(NAV_ITEMS_ORDER_KEY);
      if (orderStr) {
        savedOrder = JSON.parse(orderStr);
      }
      const visibilityStr = localStorage.getItem(NAV_ITEMS_VISIBILITY_KEY);
      if (visibilityStr) {
        savedVisibility = JSON.parse(visibilityStr);
      }
    } catch {
      // Ignore parsing errors
    }

    // Create initial config
    const initialConfig = primaryItems.map((item: MenuItem) => ({
      id: item.id,
      label: item.label,
      iconType: item.iconType,
      visible: savedVisibility[item.id] !== undefined ? savedVisibility[item.id] : true,
      isLocked: isLocked(item.id),
    }));

    // Sort by saved order, keeping locked items first
    const lockedItems = initialConfig.filter((item) => item.isLocked);
    const unlockedItems = initialConfig.filter((item) => !item.isLocked);
    
    // Sort unlocked items by saved order
    const sortedUnlocked = savedOrder.length > 0
      ? savedOrder
          .map((id) => unlockedItems.find((item) => item.id === id))
          .filter((item): item is NavItemConfig => item !== undefined)
          .concat(unlockedItems.filter((item) => !savedOrder.includes(item.id)))
      : unlockedItems;

    return [...lockedItems, ...sortedUnlocked];
  });

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => {
    // Sync state when opening modal - load current preferences
    const NAV_ITEMS_ORDER_KEY = 'core.chrome.sideNav.itemsOrder';
    const NAV_ITEMS_VISIBILITY_KEY = 'core.chrome.sideNav.itemsVisibility';
    
    let savedOrder: string[] = [];
    let savedVisibility: Record<string, boolean> = {};
    
    try {
      const orderStr = localStorage.getItem(NAV_ITEMS_ORDER_KEY);
      if (orderStr) {
        savedOrder = JSON.parse(orderStr);
      }
      const visibilityStr = localStorage.getItem(NAV_ITEMS_VISIBILITY_KEY);
      if (visibilityStr) {
        savedVisibility = JSON.parse(visibilityStr);
      }
    } catch {
      // Ignore parsing errors
    }

    // Update config to match current state
    const updatedConfig = primaryItems.map((item: MenuItem) => ({
      id: item.id,
      label: item.label,
      iconType: item.iconType,
      visible: savedVisibility[item.id] !== undefined ? savedVisibility[item.id] : true,
      isLocked: isLocked(item.id),
    }));

    const lockedItems = updatedConfig.filter((item) => item.isLocked);
    const unlockedItems = updatedConfig.filter((item) => !item.isLocked);
    
    const sortedUnlocked = savedOrder.length > 0
      ? savedOrder
          .map((id) => unlockedItems.find((item) => item.id === id))
          .filter((item): item is NavItemConfig => item !== undefined)
          .concat(unlockedItems.filter((item) => !savedOrder.includes(item.id)))
      : unlockedItems;

    setNavItemsConfig([...lockedItems, ...sortedUnlocked]);
    setIsModalOpen(true);
  };

  const handleDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!destination) return;

      // Get only unlocked items for reordering
      const unlockedItems = navItemsConfig.filter((item) => !item.isLocked);
      const sourceIndex = source.index;
      const destIndex = destination.index;

      // Reorder only within unlocked items
      const reorderedUnlocked = euiDragDropReorder(unlockedItems, sourceIndex, destIndex);
      
      // Rebuild the full array with locked items first, then reordered unlocked items
      const lockedItems = navItemsConfig.filter((item) => item.isLocked);
      const newItems = [...lockedItems, ...reorderedUnlocked];
      
      setNavItemsConfig(newItems);

      // Immediately call the callback to update parent state (only unlocked items)
      if (onSetNavItemsOrder) {
        const unlockedOrder = reorderedUnlocked.map((item) => item.id);
        onSetNavItemsOrder(unlockedOrder);
      }
    },
    [navItemsConfig, onSetNavItemsOrder]
  );

  const handleToggleVisibility = useCallback(
    (itemId: string, visible: boolean) => {
      setNavItemsConfig((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, visible } : item))
      );

      // Immediately call the callback to update parent state
      if (onSetNavItemVisibility) {
        onSetNavItemVisibility(itemId, visible);
      }
    },
    [onSetNavItemVisibility]
  );

  return (
    <>
      <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
        <EuiButtonIcon
          data-test-subj="sideNavCollapseButton"
          css={styles.sideNavCollapseButton}
          size="s"
          color="text"
          iconType={iconType}
          aria-label={i18n.translate('core.ui.chrome.sideNavigation.openModalButtonLabel', {
            defaultMessage: 'Open navigation menu',
          })}
          aria-controls={PRIMARY_NAVIGATION_ID}
          onClick={openModal}
        />
      </div>
      {isModalOpen && (
        <EuiModal
          onClose={closeModal}
          aria-labelledby="navigation-modal-title"
          maxWidth={800}
          style={{ width: '600px' }}
          outsideClickCloses={true}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="navigation-modal-title">
              {i18n.translate('core.ui.chrome.sideNavigation.modalTitle', {
                defaultMessage: 'Navigation preferences',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFlexGroup direction="row" gutterSize="l">
              <EuiFlexItem>
                <EuiSwitch
                  label={i18n.translate('core.ui.chrome.sideNavigation.showLabelsLabel', {
                    defaultMessage: 'Show labels',
                  })}
                  checked={showLabels}
                  onChange={(e) => onSetShowLabels(e.target.checked)}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSwitch
                  label={i18n.translate('core.ui.chrome.sideNavigation.showSecondaryNavigationLabel', {
                    defaultMessage: 'Show secondary navigation',
                  })}
                  checked={showSecondaryPanel}
                  onChange={(e) => onSetShowSecondaryPanel(e.target.checked)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('core.ui.chrome.sideNavigation.tabsTitle', {
                  defaultMessage: 'Tabs',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            
            {/* Locked items section (non-draggable) */}
            {navItemsConfig
              .filter((item) => item.isLocked)
              .map((item) => (
                <div
                  key={item.id}
                  css={css`
                    display: flex;
                    align-items: center;
                    padding: ${euiTheme.size.s} 4px;
                  `}
                >
                  <EuiIcon
                    type="lock"
                    color="subdued"
                    css={css`
                      margin-right: ${euiTheme.size.s};
                    `}
                  />
                  <EuiCheckbox
                    id={`nav-item-${item.id}`}
                    checked={item.visible}
                    onChange={(e) => handleToggleVisibility(item.id, e.target.checked)}
                    disabled={item.isLocked}
                    label={item.label}
                    css={css`
                      flex: 1;
                    `}
                  />
                </div>
              ))}
            
            {/* Draggable items section */}
            <EuiDragDropContext onDragEnd={handleDragEnd}>
              <EuiDroppable droppableId="navItems" spacing="s">
                {navItemsConfig
                  .filter((item) => !item.isLocked)
                  .map((item, index) => (
                      <EuiDraggable
                        key={item.id}
                        index={index}
                        draggableId={item.id}
                        customDragHandle={true}
                        hasInteractiveChildren={true}
                        usePortal={true}
                      >
                        {(provided) => (
                          <div
                            css={css`
                              display: flex;
                              align-items: center;
                              padding: ${euiTheme.size.s} 0;
                            `}
                          >
                            <div
                              {...provided.dragHandleProps}
                              css={css`
                                margin-right: ${euiTheme.size.s};
                                cursor: grab;
                                &:active {
                                  cursor: grabbing;
                                }
                              `}
                              aria-label={i18n.translate(
                                'core.ui.chrome.sideNavigation.dragHandleLabel',
                                {
                                  defaultMessage: 'Drag handle',
                                }
                              )}
                            >
                              <EuiIcon type="grab" color="subdued" />
                            </div>
                            <EuiCheckbox
                              id={`nav-item-${item.id}`}
                              checked={item.visible}
                              onChange={(e) => handleToggleVisibility(item.id, e.target.checked)}
                              label={item.label}
                              css={css`
                                flex: 1;
                              `}
                            />
                          </div>
                        )}
                      </EuiDraggable>
                    ))}
              </EuiDroppable>
            </EuiDragDropContext>
          </EuiModalBody>
        </EuiModal>
      )}
    </>
  );
};
