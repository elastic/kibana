/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useContext, useReducer, useRef, useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutChild,
  EuiFlyoutMenu,
  EuiFlyoutSize,
  EuiButtonIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiPopover,
  EuiText,
  EuiLink,
  EuiIcon,
} from '@elastic/eui';

// Types definitions
export interface FlyoutSystemConfig {
  mainSize?: EuiFlyoutSize;
  mainTitle?: string;
  hideMainTitle?: boolean;
  mainContent?: React.ReactNode;
  mainFlyoutProps?: {
    [key: string]: unknown;
  };
  childSize?: 's' | 'm';
  childTitle?: string;
  childContent?: React.ReactNode;
  childFlyoutProps?: {
    [key: string]: unknown;
  };
}

export interface FlyoutSystemOpenMainOptions {
  size: EuiFlyoutSize;
  flyoutProps?: FlyoutSystemConfig['mainFlyoutProps'];
  content: React.ReactNode;
}

export interface FlyoutSystemOpenChildOptions {
  size: 's' | 'm';
  flyoutProps?: FlyoutSystemConfig['childFlyoutProps'];
  title?: string;
  content: React.ReactNode;
}

export interface FlyoutSystemGroup {
  isMainOpen: boolean;
  isChildOpen: boolean;
  config: FlyoutSystemConfig;
}

export interface FlyoutSystemState {
  activeFlyoutGroup: FlyoutSystemGroup | null;
  history: FlyoutSystemGroup[];
}

export type FlyoutSystemAction =
  | {
      type: 'UPDATE_ACTIVE_FLYOUT_CONFIG';
      payload: {
        configChanges: Partial<FlyoutSystemConfig>;
      };
    }
  | { type: 'OPEN_MAIN_FLYOUT'; payload: FlyoutSystemOpenMainOptions }
  | {
      type: 'OPEN_CHILD_FLYOUT';
      payload: FlyoutSystemOpenChildOptions;
    }
  | { type: 'GO_BACK' }
  | { type: 'GO_TO_HISTORY_ITEM'; index: number }
  | { type: 'CLOSE_CHILD_FLYOUT' }
  | { type: 'CLOSE_SESSION' };

export interface FlyoutSystemRenderContext {
  activeFlyoutGroup: FlyoutSystemGroup | null;
}

export interface FlyoutSystemProviderProps {
  children: React.ReactNode;
  onUnmount?: () => void;
}

export interface FlyoutSystemApi {
  openFlyout: (options: FlyoutSystemOpenMainOptions) => void;
  openChildFlyout: (options: FlyoutSystemOpenChildOptions) => void;
  closeChildFlyout: () => void;
  goBack: () => void;
  closeSession: () => void;
  isFlyoutOpen: boolean;
  isChildFlyoutOpen: boolean;
  canGoBack: boolean;
}

// Initial state for the flyout system
export const initialFlyoutState: FlyoutSystemState = {
  activeFlyoutGroup: null,
  history: [],
};

// Import the reducer from the new file
import { flyoutSystemReducer } from './flyout_system_reducer';

// Context for the flyout system
interface FlyoutSystemContextProps {
  state: FlyoutSystemState;
  dispatch: React.Dispatch<FlyoutSystemAction>;
  onUnmount?: FlyoutSystemProviderProps['onUnmount'];
}

const FlyoutSystemContext = createContext<FlyoutSystemContextProps | null>(null);

export const useFlyoutSystemContext = () => {
  const context = useContext(FlyoutSystemContext);
  if (!context) {
    throw new Error('useFlyoutSystemContext must be used within a FlyoutSystemProvider');
  }
  return context;
};

// System Menu Component
const FlyoutSystemMenu = ({
  title,
  historyItems,
  handleGoBack,
  handleGoToHistoryItem,
}: {
  title?: string;
  historyItems: FlyoutSystemGroup[];
  handleGoBack: () => void;
  handleGoToHistoryItem: (index: number) => void;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const backButton = !!historyItems.length && (
    <EuiText size="s">
      <EuiLink onClick={handleGoBack} color="text">
        <EuiIcon type="editorUndo" /> Back
      </EuiLink>
    </EuiText>
  );

  const historyPopover = !!historyItems.length && (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="arrowDown"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          aria-label="History"
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="xs"
      anchorPosition="downLeft"
    >
      <EuiListGroup gutterSize="none">
        {historyItems.map((item, index) => (
          <EuiListGroupItem
            key={index}
            label={item.config.mainTitle || ''}
            size="s"
            onClick={() => {
              handleGoToHistoryItem(index);
              setIsPopoverOpen(false);
            }}
          />
        ))}
      </EuiListGroup>
    </EuiPopover>
  );

  return <EuiFlyoutMenu title={title} backButton={backButton} popover={historyPopover} />;
};

// Provider component for the flyout system
export const FlyoutSystemProvider: React.FC<FlyoutSystemProviderProps> = ({
  children,
  onUnmount,
}) => {
  const [state, dispatch] = useReducer(flyoutSystemReducer, initialFlyoutState);
  const { activeFlyoutGroup } = state;
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else if (state.activeFlyoutGroup === null) {
      onUnmount?.();
    }
  }, [state.activeFlyoutGroup, onUnmount]);

  const handleClose = () => {
    dispatch({ type: 'CLOSE_SESSION' });
  };

  const handleCloseChild = () => {
    dispatch({ type: 'CLOSE_CHILD_FLYOUT' });
  };

  const handleGoBack = () => {
    dispatch({ type: 'GO_BACK' });
  };

  const handleGoToHistoryItem = (index: number) => {
    dispatch({ type: 'GO_TO_HISTORY_ITEM', index });
  };

  const config = activeFlyoutGroup?.config;
  const flyoutPropsMain = config?.mainFlyoutProps || {};
  const flyoutPropsChild = config?.childFlyoutProps || {};
  return (
    <FlyoutSystemContext.Provider value={{ state, dispatch, onUnmount }}>
      {children}
      {activeFlyoutGroup?.isMainOpen && (
        <EuiFlyout
          onClose={handleClose}
          size={config?.mainSize}
          ownFocus={!activeFlyoutGroup.isChildOpen}
          {...flyoutPropsMain}
        >
          <FlyoutSystemMenu
            handleGoBack={handleGoBack}
            handleGoToHistoryItem={handleGoToHistoryItem}
            historyItems={state.history}
            title={!config?.hideMainTitle ? config?.mainTitle : undefined}
          />
          {config?.mainContent}
          {activeFlyoutGroup.isChildOpen && (
            <EuiFlyoutChild
              onClose={handleCloseChild}
              size={config?.childSize}
              {...flyoutPropsChild}
            >
              {config?.childTitle && <EuiFlyoutMenu title={config.childTitle} />}
              {config?.childContent}
            </EuiFlyoutChild>
          )}
        </EuiFlyout>
      )}
    </FlyoutSystemContext.Provider>
  );
};
