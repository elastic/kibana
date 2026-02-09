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
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiCallOut,
  EuiIconTip,
  EuiTabs,
  EuiTab,
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

// Appearance settings component for version 3
interface AppearanceSettingsSectionProps {
  colorMode: string;
  contrastMode: string;
  onColorModeChange: (mode: string) => void;
  onContrastModeChange: (mode: string) => void;
}

const AppearanceSettingsSection: FC<AppearanceSettingsSectionProps> = ({
  colorMode,
  contrastMode,
  onColorModeChange,
  onContrastModeChange,
}) => {
  const handleColorModeChange = useCallback((mode: string) => {
    onColorModeChange(mode);
    // Apply preview immediately via custom event
    const event = new CustomEvent('updateUserProfileForPreferences', {
      detail: {
        userSettings: {
          darkMode: mode,
          contrastMode: contrastMode,
        },
      },
    });
    window.dispatchEvent(event);
  }, [contrastMode, onColorModeChange]);

  const handleContrastModeChange = useCallback((mode: string) => {
    onContrastModeChange(mode);
    // Apply preview immediately via custom event
    const event = new CustomEvent('updateUserProfileForPreferences', {
      detail: {
        userSettings: {
          darkMode: colorMode,
          contrastMode: mode,
        },
      },
    });
    window.dispatchEvent(event);
  }, [colorMode, onContrastModeChange]);

  const colorModeItems = [
    { id: 'system', label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.systemLabel', { defaultMessage: 'System' }), icon: 'desktop' },
    { id: 'light', label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.lightLabel', { defaultMessage: 'Light' }), icon: 'sun' },
    { id: 'dark', label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.darkLabel', { defaultMessage: 'Dark' }), icon: 'moon' },
    { id: 'space_default', label: i18n.translate('xpack.security.formComponents.themeKeyPadMenu.spaceDefaultLabel', { defaultMessage: 'Space default' }), icon: 'grid' },
  ];

  const contrastModeItems = [
    { id: 'system', label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.systemLabel', { defaultMessage: 'System' }), icon: 'desktop' },
    { id: 'standard', label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.standardLabel', { defaultMessage: 'Normal' }), icon: 'contrast' },
    { id: 'high', label: i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.highLabel', { defaultMessage: 'High' }), icon: 'contrastHigh' },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.security.formComponents.themeKeyPadMenu.legend"
            defaultMessage="Color mode"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiKeyPadMenu
        aria-label={i18n.translate('xpack.security.formComponents.themeKeyPadMenu.ariaLabel', {
          defaultMessage: 'Elastic theme',
        })}
        data-test-subj="themeMenu"
        checkable={{
          legend: null,
        }}
        css={css`
          inline-size: 420px;
        `}
      >
        {colorModeItems.map((item) => (
          <EuiKeyPadMenuItem
            key={item.id}
            name={item.id}
            label={item.label}
            data-test-subj={`themeKeyPadItem${item.id}`}
            checkable="single"
            isSelected={colorMode === item.id}
            onChange={() => handleColorModeChange(item.id)}
          >
            <EuiIcon type={item.icon} size="l" />
          </EuiKeyPadMenuItem>
        ))}
      </EuiKeyPadMenu>
      
      {colorMode === 'space_default' && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            title={i18n.translate(
              'xpack.security.accountManagement.userProfile.deprecatedSpaceDefaultTitle',
              {
                defaultMessage: 'Space default settings will be removed in a future version',
              }
            )}
            color="warning"
            iconType="warning"
            size="s"
          >
            <p>
              {i18n.translate(
                'xpack.security.accountManagement.userProfile.deprecatedSpaceDefaultDescription',
                {
                  defaultMessage:
                    'All users with the Space default color mode enabled will be automatically transitioned to the System color mode.',
                }
              )}
            </p>
          </EuiCallOut>
        </>
      )}

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={true}>
              <FormattedMessage
                id="xpack.security.formComponents.contrastKeyPadMenu.legend"
                defaultMessage="Interface contrast"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={i18n.translate(
                  'xpack.security.formComponents.contrastKeyPadMenu.betaBadge.tooltip',
                  { defaultMessage: 'The contrast setting is currently a beta feature.' }
                )}
                type="beta"
                position="bottom"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiKeyPadMenu
        aria-label={i18n.translate('xpack.security.formComponents.contrastKeyPadMenu.ariaLabel', {
          defaultMessage: 'Interface contrast',
        })}
        data-test-subj="contrastMenu"
        checkable={{
          legend: null,
        }}
      >
        {contrastModeItems.map((item) => (
          <EuiKeyPadMenuItem
            key={item.id}
            name={item.id}
            label={item.label}
            data-test-subj={`contrastKeyPadItem${item.id}`}
            checkable="single"
            isSelected={contrastMode === item.id}
            onChange={() => handleContrastModeChange(item.id)}
          >
            <EuiIcon type={item.icon} size="l" />
          </EuiKeyPadMenuItem>
        ))}
      </EuiKeyPadMenu>
    </>
  );
};

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
  
  // Get current version from localStorage (for version-specific UI changes)
  const getCurrentVersion = useCallback((): 'current' | '1' | '2' | '3' => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('kibana_ui_version');
      if (stored === 'current' || stored === '1' || stored === '2' || stored === '3') {
        return stored as 'current' | '1' | '2' | '3';
      }
    }
    return 'current';
  }, []);
  
  const [currentVersion, setCurrentVersion] = useState<'current' | '1' | '2' | '3'>(getCurrentVersion);
  const [selectedTabId, setSelectedTabId] = useState<'navigation' | 'appearance'>('appearance');
  
  // Listen for version changes
  useEffect(() => {
    const handleStorageChange = () => {
      setCurrentVersion(getCurrentVersion());
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically in case version changes in same window
    const interval = setInterval(() => {
      const newVersion = getCurrentVersion();
      if (newVersion !== currentVersion) {
        setCurrentVersion(newVersion);
      }
    }, 100);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [getCurrentVersion, currentVersion]);

  // Determine locked items (first 2: Discover and Dashboards)
  const LOCKED_IDS = ['discover', 'dashboards'];
  const NAV_ITEMS_ORDER_KEY = 'core.chrome.sideNav.itemsOrder';
  const NAV_ITEMS_VISIBILITY_KEY = 'core.chrome.sideNav.itemsVisibility';
  const isLocked = useCallback((id: string) => LOCKED_IDS.includes(id.toLowerCase()), []);

  // Track initial state for change detection
  const [initialState, setInitialState] = useState<{
    showLabels: boolean;
    navItemsConfig: NavItemConfig[];
    appearanceSettings?: {
      darkMode: string;
      contrastMode: string;
    };
  } | null>(null);

  // Local state for modal (not saved until Apply is clicked)
  const [localShowLabels, setLocalShowLabels] = useState(showLabels);
  
  // Appearance settings state (for version 3)
  const [localColorMode, setLocalColorMode] = useState<string>('system');
  const [localContrastMode, setLocalContrastMode] = useState<string>('system');

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

  // Store original values for preview/revert
  const [originalShowLabels, setOriginalShowLabels] = useState(showLabels);
  const [originalNavItemsOrder, setOriginalNavItemsOrder] = useState<string[]>([]);
  const [originalNavItemsVisibility, setOriginalNavItemsVisibility] = useState<Record<string, boolean>>({});
  const [originalAppearanceSettings, setOriginalAppearanceSettings] = useState<{ darkMode: string; contrastMode: string } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const closeModal = useCallback(() => {
    if (!isApplying && initialState) {
      // Revert changes if closing without applying
      // Revert showLabels
      if (localShowLabels !== originalShowLabels) {
        onSetShowLabels(originalShowLabels);
      }
      
      // Revert navigation items order
      if (onSetNavItemsOrder) {
        try {
          localStorage.setItem(NAV_ITEMS_ORDER_KEY, JSON.stringify(originalNavItemsOrder));
          // Dispatch custom event since storage events don't fire in same window
          window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
            detail: { type: 'order', value: originalNavItemsOrder },
          }));
        } catch (e) {
          // Ignore storage errors
        }
      }
      
      // Revert navigation items visibility
      if (onSetNavItemVisibility) {
        try {
          localStorage.setItem(NAV_ITEMS_VISIBILITY_KEY, JSON.stringify(originalNavItemsVisibility));
          // Dispatch custom event since storage events don't fire in same window
          window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
            detail: { type: 'visibility', value: originalNavItemsVisibility },
          }));
        } catch (e) {
          // Ignore storage errors
        }
      }
      
      // Revert appearance settings if version 3
      if (currentVersion === '3' && originalAppearanceSettings) {
        setLocalColorMode(originalAppearanceSettings.darkMode);
        setLocalContrastMode(originalAppearanceSettings.contrastMode);
        // Revert via custom event
        const event = new CustomEvent('updateUserProfileForPreferences', {
          detail: {
            userSettings: {
              darkMode: originalAppearanceSettings.darkMode,
              contrastMode: originalAppearanceSettings.contrastMode,
            },
          },
        });
        window.dispatchEvent(event);
      }
    }
    
    // Clean up preferences listeners
    if (typeof (window as any).__cleanupPreferencesListeners === 'function') {
      (window as any).__cleanupPreferencesListeners();
    }
    
    setIsModalOpen(false);
    setIsApplying(false);
    // Reset local state when closing
    setLocalShowLabels(showLabels);
    setInitialState(null);
    // Reset appearance settings state for version 3
    if (currentVersion === '3') {
      setSelectedTabId('appearance');
      // Reset to original values if not applying
      if (!isApplying && originalAppearanceSettings) {
        setLocalColorMode(originalAppearanceSettings.darkMode);
        setLocalContrastMode(originalAppearanceSettings.contrastMode);
      }
    }
  }, [isApplying, initialState, localShowLabels, originalShowLabels, originalNavItemsOrder, originalNavItemsVisibility, onSetShowLabels, onSetNavItemsOrder, onSetNavItemVisibility, currentVersion, originalAppearanceSettings]);

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

    // Store original values for revert
    setOriginalShowLabels(showLabels);
    setOriginalNavItemsOrder(savedOrder);
    setOriginalNavItemsVisibility(savedVisibility);

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
    
    // Load appearance settings for version 3
    if (currentVersion === '3') {
      // Request user profile data via custom event
      const requestEvent = new CustomEvent('getUserProfileForPreferences');
      window.dispatchEvent(requestEvent);
      
      let responseReceived = false;
      
      // Listen for response
      const handleResponse = (e: Event) => {
        responseReceived = true;
        const customEvent = e as CustomEvent<{ userSettings?: { darkMode?: string; contrastMode?: string } }>;
        if (customEvent.detail?.userSettings) {
          const darkMode = customEvent.detail.userSettings.darkMode || 'system';
          const contrast = customEvent.detail.userSettings.contrastMode || 'system';
          setLocalColorMode(darkMode);
          setLocalContrastMode(contrast);
          setOriginalAppearanceSettings({ darkMode, contrast });
          
          // Store initial state for change detection
          setInitialState({
            showLabels,
            navItemsConfig: initialConfig,
            appearanceSettings: { darkMode, contrast },
          });
        } else {
          // Default values if no user settings
          const defaultDarkMode = 'system';
          const defaultContrast = 'system';
          setLocalColorMode(defaultDarkMode);
          setLocalContrastMode(defaultContrast);
          setOriginalAppearanceSettings({ darkMode: defaultDarkMode, contrast: defaultContrast });
          
          setInitialState({
            showLabels,
            navItemsConfig: initialConfig,
            appearanceSettings: { darkMode: defaultDarkMode, contrast: defaultContrast },
          });
        }
        window.removeEventListener('userProfileForPreferences', handleResponse);
      };
      
      window.addEventListener('userProfileForPreferences', handleResponse);
      
      // Set a timeout to handle case where response doesn't come
      setTimeout(() => {
        if (!responseReceived) {
          const defaultDarkMode = 'system';
          const defaultContrast = 'system';
          setLocalColorMode(defaultDarkMode);
          setLocalContrastMode(defaultContrast);
          setOriginalAppearanceSettings({ darkMode: defaultDarkMode, contrast: defaultContrast });
          
          setInitialState({
            showLabels,
            navItemsConfig: initialConfig,
            appearanceSettings: { darkMode: defaultDarkMode, contrast: defaultContrast },
          });
        }
      }, 100);
    } else {
      // Store initial state for change detection (non-3 version)
      setInitialState({
        showLabels,
        navItemsConfig: initialConfig,
      });
    }
    
    setIsModalOpen(true);
  }, [primaryItems, isLocked, showLabels, currentVersion]);

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
    
    // Listen for user profile data requests (for appearance settings in version 3)
    const handleGetUserProfile = (e: Event) => {
      const customEvent = e as CustomEvent;
      // User profile data will be provided by footer_user_menu via another event
    };
    
    // Listen for user profile updates (for appearance settings preview)
    const handleUpdateUserProfile = (e: Event) => {
      const customEvent = e as CustomEvent<{ userSettings?: { darkMode?: string; contrastMode?: string } }>;
      if (customEvent.detail?.userSettings) {
        // Update will be handled by the appearance settings component
      }
    };
    
    window.addEventListener('getUserProfileForPreferences', handleGetUserProfile);
    window.addEventListener('updateUserProfileForPreferences', handleUpdateUserProfile);
    
    return () => {
      delete (window as any).__openNavigationPreferencesModal;
      window.removeEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
      document.removeEventListener('openNavigationPreferencesModal', handleOpenModalEvent, true);
      window.removeEventListener('getUserProfileForPreferences', handleGetUserProfile);
      window.removeEventListener('updateUserProfileForPreferences', handleUpdateUserProfile);
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
      
      // Apply preview immediately
      const unlockedOrder = reorderedUnlocked.map((item) => item.id);
      if (onSetNavItemsOrder) {
        try {
          localStorage.setItem(NAV_ITEMS_ORDER_KEY, JSON.stringify(unlockedOrder));
          // Dispatch custom event since storage events don't fire in same window
          window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
            detail: { type: 'order', value: unlockedOrder },
          }));
        } catch (e) {
          // Ignore storage errors
        }
      }
    },
    [navItemsConfig, onSetNavItemsOrder]
  );

  const handleToggleVisibility = useCallback(
    (itemId: string, visible: boolean) => {
      setNavItemsConfig((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, visible } : item))
      );
      
      // Apply preview immediately
      if (onSetNavItemVisibility) {
        try {
          const visibilityStr = localStorage.getItem(NAV_ITEMS_VISIBILITY_KEY);
          const visibility = visibilityStr ? JSON.parse(visibilityStr) : {};
          visibility[itemId] = visible;
          localStorage.setItem(NAV_ITEMS_VISIBILITY_KEY, JSON.stringify(visibility));
          // Dispatch custom event since storage events don't fire in same window
          window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
            detail: { type: 'visibility', value: visibility },
          }));
        } catch (e) {
          // Ignore storage errors
        }
      }
    },
    [onSetNavItemVisibility]
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
    
    // Check appearance settings changes (for version 3)
    if (currentVersion === '3' && initialState.appearanceSettings) {
      if (
        localColorMode !== initialState.appearanceSettings.darkMode ||
        localContrastMode !== initialState.appearanceSettings.contrastMode
      ) {
        count++;
      }
    }
    
    return count;
  }, [initialState, localShowLabels, navItemsConfig, currentVersion, localColorMode, localContrastMode]);

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
      appearanceSettings: currentVersion === '3' ? {
        darkMode: 'system',
        contrastMode: 'system',
      } : undefined,
    };
  }, [primaryItems, isLocked, currentVersion]);

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
      return false;
    }
    
    // Check visibility - all should be visible
    const allVisible = navItemsConfig.every((item) => item.visible === true);
    if (!allVisible) {
      return false;
    }
    
    // Check appearance settings (for version 3)
    if (currentVersion === '3' && defaultState.appearanceSettings) {
      if (
        localColorMode !== defaultState.appearanceSettings.darkMode ||
        localContrastMode !== defaultState.appearanceSettings.contrastMode
      ) {
        return false;
      }
    }
    
    return true;
  }, [localShowLabels, navItemsConfig, getDefaultState, currentVersion, localColorMode, localContrastMode]);

  // Handle discard - reset to initial state (when modal was opened)
  const handleDiscard = useCallback(() => {
    if (!initialState) return;
    setLocalShowLabels(initialState.showLabels);
    setNavItemsConfig(initialState.navItemsConfig);
    
    // Revert appearance settings (for version 3)
    if (currentVersion === '3' && initialState.appearanceSettings) {
      setLocalColorMode(initialState.appearanceSettings.darkMode);
      setLocalContrastMode(initialState.appearanceSettings.contrastMode);
      // Revert via custom event
      const event = new CustomEvent('updateUserProfileForPreferences', {
        detail: {
          userSettings: {
            darkMode: initialState.appearanceSettings.darkMode,
            contrastMode: initialState.appearanceSettings.contrastMode,
          },
        },
      });
      window.dispatchEvent(event);
    }
    
    // Apply preview immediately - revert to initial state
    onSetShowLabels(initialState.showLabels);
    
    // Revert navigation items order
    if (onSetNavItemsOrder && initialState.navItemsConfig) {
      const unlockedItems = initialState.navItemsConfig.filter((item) => !item.isLocked);
      const unlockedOrder = unlockedItems.map((item) => item.id);
      try {
        localStorage.setItem(NAV_ITEMS_ORDER_KEY, JSON.stringify(unlockedOrder));
        window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
          detail: { type: 'order', value: unlockedOrder },
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Revert navigation items visibility
    if (onSetNavItemVisibility && initialState.navItemsConfig) {
      const visibility: Record<string, boolean> = {};
      initialState.navItemsConfig.forEach((item) => {
        visibility[item.id] = item.visible;
      });
      try {
        localStorage.setItem(NAV_ITEMS_VISIBILITY_KEY, JSON.stringify(visibility));
        window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
          detail: { type: 'visibility', value: visibility },
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [initialState, onSetShowLabels, onSetNavItemsOrder, onSetNavItemVisibility, currentVersion]);

  // Handle reset - reset to default state (as if opening deployment for first time)
  const handleReset = useCallback(() => {
    const defaultState = getDefaultState();
    setNavItemsConfig(defaultState.navItemsConfig);
    setLocalShowLabels(defaultState.showLabels);
    
    // Reset appearance settings (for version 3)
    if (currentVersion === '3' && defaultState.appearanceSettings) {
      setLocalColorMode(defaultState.appearanceSettings.darkMode);
      setLocalContrastMode(defaultState.appearanceSettings.contrastMode);
      // Apply preview immediately via custom event
      const event = new CustomEvent('updateUserProfileForPreferences', {
        detail: {
          userSettings: {
            darkMode: defaultState.appearanceSettings.darkMode,
            contrastMode: defaultState.appearanceSettings.contrastMode,
          },
        },
      });
      window.dispatchEvent(event);
    }
    
    // Apply preview immediately
    onSetShowLabels(defaultState.showLabels);
    
    // Reset navigation items order
    if (onSetNavItemsOrder) {
      const unlockedItems = defaultState.navItemsConfig.filter((item) => !item.isLocked);
      const unlockedOrder = unlockedItems.map((item) => item.id);
      try {
        localStorage.setItem(NAV_ITEMS_ORDER_KEY, JSON.stringify(unlockedOrder));
        // Dispatch custom event since storage events don't fire in same window
        window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
          detail: { type: 'order', value: unlockedOrder },
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Reset navigation items visibility (all visible)
    if (onSetNavItemVisibility) {
      const allVisible: Record<string, boolean> = {};
      defaultState.navItemsConfig.forEach((item) => {
        allVisible[item.id] = true;
      });
      try {
        localStorage.setItem(NAV_ITEMS_VISIBILITY_KEY, JSON.stringify(allVisible));
        // Dispatch custom event since storage events don't fire in same window
        window.dispatchEvent(new CustomEvent('navigationPreferencesChanged', {
          detail: { type: 'visibility', value: allVisible },
        }));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [getDefaultState, onSetShowLabels, onSetNavItemsOrder, onSetNavItemVisibility, currentVersion]);

  // Handle apply - changes are already applied, just close modal
  const handleApply = useCallback(() => {
    if (!hasChanges) return;
    
    // Mark as applying so closeModal doesn't revert changes
    setIsApplying(true);
    
    // Ensure final state is saved via callbacks (for consistency)
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
    
    // Save appearance settings (for version 3)
    if (currentVersion === '3' && initialState?.appearanceSettings) {
      const hasAppearanceChanges =
        localColorMode !== initialState.appearanceSettings.darkMode ||
        localContrastMode !== initialState.appearanceSettings.contrastMode;
      
      if (hasAppearanceChanges) {
        // Save via user profile API client
        const userProfileApiClient = (window as any).__kbnUserProfileApiClient;
        if (userProfileApiClient) {
          userProfileApiClient.partialUpdate({
            userSettings: {
              darkMode: localColorMode,
              contrastMode: localContrastMode,
            },
          }).catch(() => {
            // Error handling is done by the API client
          });
        }
      }
    }
    
    // Close modal after saving
    setTimeout(() => {
      closeModal();
    }, 100);
  }, [hasChanges, localShowLabels, showLabels, navItemsConfig, initialState, onSetShowLabels, onSetNavItemsOrder, onSetNavItemVisibility, closeModal, currentVersion, localColorMode, localContrastMode]);

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
          maxWidth={currentVersion === '3' ? 800 : 500}
          style={{ 
            width: currentVersion === '3' ? '800px' : '500px', 
            height: currentVersion === '3' ? '640px' : undefined,
            maxHeight: currentVersion === '3' ? '640px' : '90vh', 
            display: 'flex', 
            flexDirection: 'column' 
          }}
          outsideClickCloses={true}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="navigation-modal-title">
              {currentVersion === '3' ? (
                <FormattedMessage
                  id="xpack.security.navControlComponent.preferencesModal.title"
                  defaultMessage="Preferences"
                />
              ) : (
                i18n.translate('core.ui.chrome.sideNavigation.modalTitle', {
                  defaultMessage: 'Navigation preferences',
                })
              )}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody style={{ flex: 1, overflowY: 'auto', paddingBottom: '80px' }}>
            {currentVersion === '3' ? (
              <>
                <div
                  css={css`
                    position: sticky;
                    top: 0;
                    background: ${euiTheme.colors.emptyShade};
                    z-index: 1;
                    padding-top: ${euiTheme.size.m};
                    padding-bottom: ${euiTheme.size.m};
                    margin-top: -${euiTheme.size.m};
                    margin-left: -${euiTheme.size.m};
                    margin-right: -${euiTheme.size.m};
                    padding-left: ${euiTheme.size.m};
                    padding-right: ${euiTheme.size.m};
                  `}
                >
                  <EuiTabs size="s">
                    <EuiTab
                      onClick={() => setSelectedTabId('appearance')}
                      isSelected={selectedTabId === 'appearance'}
                      data-test-subj="preferencesAppearanceTab"
                    >
                      <FormattedMessage
                        id="xpack.security.navControlComponent.preferencesModal.appearanceTab"
                        defaultMessage="Appearance"
                      />
                    </EuiTab>
                    <EuiTab
                      onClick={() => setSelectedTabId('navigation')}
                      isSelected={selectedTabId === 'navigation'}
                      data-test-subj="preferencesNavigationTab"
                    >
                      <FormattedMessage
                        id="xpack.security.navControlComponent.preferencesModal.navigationTab"
                        defaultMessage="Navigation"
                      />
                    </EuiTab>
                  </EuiTabs>
                </div>
                <EuiSpacer size="l" />
                
                {selectedTabId === 'navigation' && (
                  <>
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.security.navControlComponent.preferencesModal.primaryNavigationTitle"
                          defaultMessage="Primary navigation"
                        />
                      </h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiSwitch
                      label={i18n.translate('core.ui.chrome.sideNavigation.showLabelsLabel', {
                        defaultMessage: 'Show labels',
                      })}
                      checked={localShowLabels}
                      onChange={(e) => {
                        const newValue = e.target.checked;
                        setLocalShowLabels(newValue);
                        // Apply preview immediately
                        onSetShowLabels(newValue);
                      }}
                    />
                    <EuiSpacer size="l" />
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.security.navControlComponent.preferencesModal.availableItemsTitle"
                          defaultMessage="Available items"
                        />
                      </h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                  </>
                )}
                
                {selectedTabId === 'appearance' && (
                  <AppearanceSettingsSection
                    colorMode={localColorMode}
                    contrastMode={localContrastMode}
                    onColorModeChange={setLocalColorMode}
                    onContrastModeChange={setLocalContrastMode}
                  />
                )}
              </>
            ) : (
              <>
                <EuiSwitch
                  label={i18n.translate('core.ui.chrome.sideNavigation.showLabelsLabel', {
                    defaultMessage: 'Show labels',
                  })}
                  checked={localShowLabels}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setLocalShowLabels(newValue);
                    // Apply preview immediately
                    onSetShowLabels(newValue);
                  }}
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
              </>
            )}
            
            {/* Navigation content - only show when navigation tab is selected or not version 3 */}
            {((currentVersion === '3' && selectedTabId === 'navigation') || currentVersion !== '3') && (
              <>
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
              </>
            )}
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
