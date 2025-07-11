/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlyoutSystemState, FlyoutSystemAction, FlyoutSystemGroup } from './flyout_system_provider';

// Helper function to apply size constraints
const applySizeConstraints = <FlyoutMeta,>(group: FlyoutSystemGroup): FlyoutSystemGroup => {
  const originalMainSize = group.config.mainSize;
  const originalChildSize = group.config.childSize;
  let newMainSize = originalMainSize;
  let newChildSize = originalChildSize;

  if (group.isChildOpen) {
    if (originalMainSize === 'l') {
      newMainSize = 'm'; // If main is 'l' with child, it must be converted to 'm'
      newChildSize = 's'; // And child must be 's'
    } else if (originalMainSize === 'm' && originalChildSize !== 's') {
      newChildSize = 's'; // If main is 'm' with child, child must be 's'
    }
  }

  // If sizes haven't changed, return the original group to preserve references
  if (newMainSize === originalMainSize && newChildSize === originalChildSize) {
    return group;
  }

  return {
    ...group,
    config: {
      ...group.config,
      mainSize: newMainSize,
      childSize: newChildSize,
    },
  };
};

// Reducer to handle all state transitions
export function flyoutSystemReducer(
  state: FlyoutSystemState,
  action: FlyoutSystemAction
): FlyoutSystemState {
  switch (action.type) {
    case 'OPEN_MAIN_FLYOUT': {
      const { size, flyoutProps, content } = action.payload;
      const newHistory = state.activeFlyoutGroup
        ? [state.activeFlyoutGroup, ...state.history]
        : state.history;
      const newActiveGroup: FlyoutSystemGroup = {
        isMainOpen: true,
        isChildOpen: false,
        config: {
          mainSize: size,
          mainFlyoutProps: flyoutProps,
          mainContent: content,
          childFlyoutProps: {},
        },
      };
      return {
        activeFlyoutGroup: applySizeConstraints(newActiveGroup),
        history: newHistory,
      };
    }
    case 'OPEN_CHILD_FLYOUT': {
      if (!state.activeFlyoutGroup) return state;
      const { size, flyoutProps, title, content } = action.payload;
      const updatedActiveGroup: FlyoutSystemGroup = {
        ...state.activeFlyoutGroup,
        isChildOpen: true,
        config: {
          ...state.activeFlyoutGroup.config,
          childTitle: title,
          childSize: size,
          childContent: content,
          childFlyoutProps: flyoutProps,
        },
      };
      return {
        ...state,
        activeFlyoutGroup: applySizeConstraints(updatedActiveGroup),
      };
    }
    case 'CLOSE_CHILD_FLYOUT': {
      if (!state.activeFlyoutGroup) return state;
      const updatedActiveGroup: FlyoutSystemGroup = {
        ...state.activeFlyoutGroup,
        isChildOpen: false,
        config: { ...state.activeFlyoutGroup.config, childFlyoutProps: {} },
      };
      return {
        ...state,
        activeFlyoutGroup: applySizeConstraints(updatedActiveGroup),
      };
    }
    case 'GO_TO_HISTORY_ITEM': {
      const { index } = action;
      const targetGroup = state.history[index];
      if (!targetGroup) return state;
      const newHistory = state.history.slice(index + 1);
      return {
        activeFlyoutGroup: applySizeConstraints(targetGroup),
        history: newHistory,
      };
    }
    case 'GO_BACK': {
      if (state.history.length === 0) return { activeFlyoutGroup: null, history: [] } as any;
      const [previousGroup, ...newHistory] = state.history;
      return {
        activeFlyoutGroup: applySizeConstraints(previousGroup),
        history: newHistory,
      };
    }
    case 'UPDATE_ACTIVE_FLYOUT_CONFIG': {
      if (!state.activeFlyoutGroup) return state;
      const { configChanges } = action.payload;
      const updatedActiveGroup: FlyoutSystemGroup = {
        ...state.activeFlyoutGroup,
        config: { ...state.activeFlyoutGroup.config, ...configChanges },
      };
      return {
        ...state,
        activeFlyoutGroup: applySizeConstraints(updatedActiveGroup),
      };
    }
    case 'CLOSE_SESSION':
      return { activeFlyoutGroup: null, history: [] } as any;
    default:
      return state;
  }
}
