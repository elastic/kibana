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
  EuiFlyoutProps,
  EuiFlyoutSize,
  EuiFlyoutChild,
  EuiFlyoutChildProps,
  EuiFlyoutMenu,
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
  mainSize: EuiFlyoutSize;
  mainTitle?: string;
  hideMainTitle?: boolean;
  childSize?: 's' | 'm';
  childTitle?: string;
  mainFlyoutProps?: Partial<Omit<EuiFlyoutProps, 'children'>>;
  childFlyoutProps?: Partial<Omit<EuiFlyoutChildProps, 'children'>>;
  isSystem?: boolean;
}

export interface FlyoutSystemOpenMainOptions<Meta = unknown> {
  size: EuiFlyoutSize;
  flyoutProps?: FlyoutSystemConfig['mainFlyoutProps'];
  meta?: Meta;
}

export interface FlyoutSystemOpenChildOptions<Meta = unknown> {
  size: 's' | 'm';
  flyoutProps?: FlyoutSystemConfig['childFlyoutProps'];
  title: string;
  meta?: Meta;
}

export interface FlyoutSystemGroup<FlyoutMeta> {
  isMainOpen: boolean;
  isChildOpen: boolean;
  config: FlyoutSystemConfig;
  meta?: FlyoutMeta;
}

export interface FlyoutSystemState<FlyoutMeta = unknown> {
  activeFlyoutGroup: FlyoutSystemGroup<FlyoutMeta> | null;
  history: Array<FlyoutSystemGroup<FlyoutMeta>>;
}

export type FlyoutSystemAction<FlyoutMeta = unknown> =
  | {
      type: 'UPDATE_ACTIVE_FLYOUT_CONFIG';
      payload: {
        configChanges: Partial<FlyoutSystemConfig>;
      };
    }
  | { type: 'OPEN_MAIN_FLYOUT'; payload: FlyoutSystemOpenMainOptions<FlyoutMeta> }
  | {
      type: 'OPEN_CHILD_FLYOUT';
      payload: FlyoutSystemOpenChildOptions<FlyoutMeta>;
    }
  | { type: 'GO_BACK' }
  | { type: 'GO_TO_HISTORY_ITEM'; index: number }
  | { type: 'CLOSE_CHILD_FLYOUT' }
  | { type: 'CLOSE_SESSION' };

export interface FlyoutSystemRenderContext<FlyoutMeta = unknown> {
  activeFlyoutGroup: FlyoutSystemGroup<FlyoutMeta> | null;
  meta?: FlyoutMeta;
}

export interface FlyoutSystemProviderProps<FlyoutMeta = any> {
  children: React.ReactNode;
  onUnmount?: () => void;
  renderMainFlyoutContent: (context: FlyoutSystemRenderContext<FlyoutMeta>) => React.ReactNode;
  renderChildFlyoutContent?: (context: FlyoutSystemRenderContext<FlyoutMeta>) => React.ReactNode;
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
export const initialFlyoutState: FlyoutSystemState<unknown> = {
  activeFlyoutGroup: null,
  history: [],
};

// Import the reducer from the new file
import { flyoutSystemReducer } from './flyout_system_reducer';

// Context for the flyout system
interface FlyoutSystemContextProps {
  state: FlyoutSystemState<any>;
  dispatch: React.Dispatch<FlyoutSystemAction<any>>;
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
  historyItems: Array<FlyoutSystemGroup<unknown>>;
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
  renderMainFlyoutContent,
  renderChildFlyoutContent,
  onUnmount,
}) => {
  const [state, dispatch] = useReducer(flyoutSystemReducer, initialFlyoutState);
  const { activeFlyoutGroup } = state;
  const isInitialMount = useRef(true);

  useEffect(() => {
    // When there is no active flyout, we should call the onUnmount callback.
    // Ensure this is not called on the initial render, only on subsequent state changes.
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

  let mainFlyoutContentNode: React.ReactNode = null;
  let childFlyoutContentNode: React.ReactNode = null;

  if (activeFlyoutGroup) {
    const renderContext: FlyoutSystemRenderContext = {
      activeFlyoutGroup,
      meta: activeFlyoutGroup.meta,
    };
    mainFlyoutContentNode = renderMainFlyoutContent(renderContext);

    if (activeFlyoutGroup.isChildOpen && renderChildFlyoutContent) {
      childFlyoutContentNode = renderChildFlyoutContent(renderContext);
    }
  }

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
          {config?.isSystem && (
            <FlyoutSystemMenu
              handleGoBack={handleGoBack}
              handleGoToHistoryItem={handleGoToHistoryItem}
              historyItems={state.history}
              title={!config?.hideMainTitle ? config?.mainTitle : undefined}
            />
          )}
          {mainFlyoutContentNode}
          {activeFlyoutGroup.isChildOpen && childFlyoutContentNode && (
            <EuiFlyoutChild
              onClose={handleCloseChild}
              size={config?.childSize}
              {...flyoutPropsChild}
            >
              {config?.childTitle && <EuiFlyoutMenu title={config.childTitle} />}
              {childFlyoutContentNode}
            </EuiFlyoutChild>
          )}
        </EuiFlyout>
      )}
    </FlyoutSystemContext.Provider>
  );
};
