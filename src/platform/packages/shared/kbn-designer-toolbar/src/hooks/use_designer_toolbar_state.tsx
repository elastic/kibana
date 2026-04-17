/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { DesignerToolbarItem } from '../state/designer_toolbar_state';
import { DesignerToolbarStateManager } from '../state/designer_toolbar_state';

const REGISTRY_KEY = '__KIBANA_DESIGNER_TOOLBAR_CTX__';

interface DesignerToolbarRegistry {
  designerToolbarStateManager?: DesignerToolbarStateManager;
}

const getGlobalRegistry = (): DesignerToolbarRegistry => {
  if (typeof globalThis === 'undefined') {
    return {};
  }
  return ((globalThis as unknown as Record<string, DesignerToolbarRegistry>)[REGISTRY_KEY] ??=
    {} as DesignerToolbarRegistry);
};

const registry = getGlobalRegistry();

const getOrCreateGlobalStateManager = (): DesignerToolbarStateManager => {
  return (registry.designerToolbarStateManager ??= new DesignerToolbarStateManager());
};

export interface DesignerToolbarState {
  items: DesignerToolbarItem[];
  registerItem: (item: DesignerToolbarItem) => () => void;
}

export const useDesignerToolbarState = (): DesignerToolbarState => {
  const designerToolbarStateManager = getOrCreateGlobalStateManager();
  const [state, setState] = useState(() => ({
    items: designerToolbarStateManager.getItems(),
  }));

  useEffect(() => {
    return designerToolbarStateManager.subscribe(() => {
      setState({
        items: designerToolbarStateManager.getItems(),
      });
    });
  }, [designerToolbarStateManager]);

  const registerItem = useCallback(
    (item: DesignerToolbarItem) => {
      return designerToolbarStateManager.registerItem(item);
    },
    [designerToolbarStateManager]
  );

  return {
    items: state.items,
    registerItem,
  };
};
