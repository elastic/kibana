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
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiIcon,
  EuiCheckbox,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  euiDragDropReorder,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { DropResult } from '@hello-pangea/dnd';
import { css } from '@emotion/react';
import type { FC } from 'react';
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PRIMARY_NAVIGATION_ID, TOOLTIP_OFFSET } from '../constants';
import type { MenuItem } from '../../types';
import type { IconType } from '@elastic/eui';
import { useTooltip } from '../hooks/use_tooltip';

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
  const { tooltipRef, handleMouseOut } = useTooltip();

  // Determine locked items (first 2: Discover and Dashboards)
  const LOCKED_IDS = ['discover', 'dashboards'];
  const NAV_ITEMS_ORDER_KEY = 'core.chrome.sideNav.itemsOrder';
  const NAV_ITEMS_VISIBILITY_KEY = 'core.chrome.sideNav.itemsVisibility';
  const isLocked = useCallback((id: string) => LOCKED_IDS.includes(id.toLowerCase()), []);

  // Track initial state for change detection
  const [initialState, setInitialState] = useState<{
    showLabels: boolean;
    navItemsConfig: NavItemConfig[];
  } | null>(null);

  // Local state for modal (not saved until Apply is clicked)
  const [localShowLabels, setLocalShowLabels] = useState(showLabels);

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

  const closeModal = () => {
    setIsModalOpen(false);
    // Reset local state when closing
    setLocalShowLabels(showLabels);
    setInitialState(null);
  };

  const openModal = useCallback(() => {
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

    const initialConfig = [...lockedItems, ...sortedUnlocked];
    setNavItemsConfig(initialConfig);
    setLocalShowLabels(showLabels);
    
    // Store initial state for change detection
    setInitialState({
      showLabels,
      navItemsConfig: initialConfig,
    });
    
    setIsModalOpen(true);
  }, [primaryItems, isLocked, showLabels]);

  // Expose openModal function globally and listen for custom event
  useEffect(() => {
    // Set the global function immediately
    (window as any).__openNavigationPreferencesModal = openModal;
    
    const handleOpenModalEvent = (e?: Event) => {
      e?.preventDefault();
      e?.stopPropagation();
      openModal();
    };
    
    // Listen for custom event on window (capture phase to catch early)
    window.addEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
    // Also listen on document as fallback
    document.addEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
    
    return () => {
      delete (window as any).__openNavigationPreferencesModal;
      window.removeEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
      document.removeEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
    };
  }, [openModal]);

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
      // Don't save immediately - wait for Apply button
    },
    [navItemsConfig]
  );

  const handleToggleVisibility = useCallback(
    (itemId: string, visible: boolean) => {
      setNavItemsConfig((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, visible } : item))
      );
      // Don't save immediately - wait for Apply button
    },
    []
  );

  // Calculate change count
  const changeCount = useMemo(() => {
    if (!initialState) return 0;
    
    let count = 0;
    
    // Check showLabels change
    if (localShowLabels !== initialState.showLabels) {
      count++;
    }
    
    // Check navItemsConfig changes (order or visibility)
    const initialOrder = initialState.navItemsConfig.map((item) => item.id);
    const currentOrder = navItemsConfig.map((item) => item.id);
    const orderChanged = JSON.stringify(initialOrder) !== JSON.stringify(currentOrder);
    if (orderChanged) {
      count++;
    }
    
    // Check visibility changes
    const visibilityChanges = initialState.navItemsConfig.filter((initialItem) => {
      const currentItem = navItemsConfig.find((item) => item.id === initialItem.id);
      return currentItem && initialItem.visible !== currentItem.visible;
    }).length;
    
    count += visibilityChanges;
    
    return count;
  }, [initialState, localShowLabels, navItemsConfig]);

  const hasChanges = changeCount > 0;

  // Get default state (as if opening deployment for first time)
  const getDefaultState = useCallback(() => {
    const defaultConfig = primaryItems.map((item: MenuItem) => ({
      id: item.id,
      label: item.label,
      iconType: item.iconType,
      visible: true, // All items visible by default
      isLocked: isLocked(item.id),
    }));

    // Keep locked items first, then unlocked items in original order
    const lockedItems = defaultConfig.filter((item) => item.isLocked);
    const unlockedItems = defaultConfig.filter((item) => !item.isLocked);
    const defaultNavItemsConfig = [...lockedItems, ...unlockedItems];

    return {
      showLabels: false, // Default is false (collapsed)
      navItemsConfig: defaultNavItemsConfig,
    };
  }, [primaryItems, isLocked]);

  // Check if current state matches default state
  const isDefaultState = useMemo(() => {
    const defaultState = getDefaultState();
    
    // Check showLabels
    if (localShowLabels !== defaultState.showLabels) {
      return false;
    }
    
    // Check navItemsConfig order
    const defaultOrder = defaultState.navItemsConfig.map((item) => item.id);
    const currentOrder = navItemsConfig.map((item) => item.id);
    if (JSON.stringify(defaultOrder) !== JSON.stringify(currentOrder)) {
    }
    
    // Check visibility - all should be visible
    const allVisible = navItemsConfig.every((item) => item.visible === true);
    if (!allVisible) {
      return false;
    }
    
    return true;
  }, [localShowLabels, navItemsConfig, getDefaultState]);

  // Handle discard - reset to initial state (when modal was opened)
  const handleDiscard = useCallback(() => {
    if (!initialState) return;
    setLocalShowLabels(initialState.showLabels);
    setNavItemsConfig(initialState.navItemsConfig);
  }, [initialState]);

  // Handle reset - reset to default state (as if opening deployment for first time)
  const handleReset = useCallback(() => {
    const defaultState = getDefaultState();
    setNavItemsConfig(defaultState.navItemsConfig);
    setLocalShowLabels(defaultState.showLabels);
  }, [getDefaultState]);

  // Handle apply - save changes and close modal
  const handleApply = useCallback(() => {
    if (!hasChanges) return;
    
    // Save showLabels
    if (localShowLabels !== showLabels) {
      onSetShowLabels(localShowLabels);
    }
    
    // Save nav items order (only unlocked items)
    const unlockedItems = navItemsConfig.filter((item) => !item.isLocked);
    const unlockedOrder = unlockedItems.map((item) => item.id);
    if (onSetNavItemsOrder) {
      onSetNavItemsOrder(unlockedOrder);
    }
    
    // Save nav items visibility
    navItemsConfig.forEach((item) => {
      const initialItem = initialState?.navItemsConfig.find((i) => i.id === item.id);
      if (!initialItem || initialItem.visible !== item.visible) {
        if (onSetNavItemVisibility) {
          onSetNavItemVisibility(item.id, item.visible);
        }
      }
    });
    
    // Close modal after saving
    setTimeout(() => {
      closeModal();
    }, 100);
  }, [hasChanges, localShowLabels, showLabels, navItemsConfig, initialState, onSetShowLabels, onSetNavItemsOrder, onSetNavItemVisibility]);

  const button = (
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
  );

  const tooltipContent = i18n.translate('core.ui.chrome.sideNavigation.navigationPreferencesTooltip', {
    defaultMessage: 'Navigation preferences',
  });

  return (
    <>
      <div className="sideNavCollapseButtonWrapper" css={styles.sideNavCollapseButtonWrapper}>
        {!showLabels ? (
          <EuiToolTip
            ref={tooltipRef}
            content={tooltipContent}
            disableScreenReaderOutput
            onMouseOut={handleMouseOut}
            position="right"
            repositionOnScroll
            offset={TOOLTIP_OFFSET}
          >
            {button}
          </EuiToolTip>
        ) : (
          button
        )}
      </div>
      {isModalOpen && (
        <EuiModal
          onClose={closeModal}
          aria-labelledby="navigation-modal-title"
          maxWidth={500}
          style={{ width: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          outsideClickCloses={true}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="navigation-modal-title">
              {i18n.translate('core.ui.chrome.sideNavigation.modalTitle', {
                defaultMessage: 'Navigation preferences',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            <EuiSwitch
              label={i18n.translate('core.ui.chrome.sideNavigation.showLabelsLabel', {
                defaultMessage: 'Show labels',
              })}
              checked={localShowLabels}
              onChange={(e) => setLocalShowLabels(e.target.checked)}
            />
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
          {/* Fixed footer with save/discard buttons */}
          <div
            css={css`
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              padding: ${euiTheme.size.m};
              background: ${euiTheme.colors.emptyShade};
              border-top: ${euiTheme.border.thin};
            `}
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty 
                  onClick={handleReset} 
                  color="danger"
                  iconType="refresh"
                  disabled={isDefaultState}
                >
                  <FormattedMessage
                    id="core.ui.chrome.sideNavigation.resetButton"
                    defaultMessage="Reset"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s">
                  {hasChanges && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty 
                        onClick={handleDiscard} 
                        color="text"
                      >
                        <FormattedMessage
                          id="core.ui.chrome.sideNavigation.discardChangesButton"
                          defaultMessage="Discard"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={handleApply}
                      fill
                      disabled={!hasChanges}
                    >
                      <FormattedMessage
                        id="core.ui.chrome.sideNavigation.applyChangesButton"
                        defaultMessage="Apply"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </EuiModal>
      )}
    </>
  );
};
