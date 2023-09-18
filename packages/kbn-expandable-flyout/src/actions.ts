/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlyoutPanelProps } from './types';

export enum ActionType {
  openFlyout = 'open_flyout',
  openRightPanel = 'open_right_panel',
  openLeftPanel = 'open_left_panel',
  openPreviewPanel = 'open_preview_panel',
  closeRightPanel = 'close_right_panel',
  closeLeftPanel = 'close_left_panel',
  closePreviewPanel = 'close_preview_panel',
  previousPreviewPanel = 'previous_preview_panel',
  closeFlyout = 'close_flyout',
}

export type Action =
  | {
      type: ActionType.openFlyout;
      payload: {
        right?: FlyoutPanelProps;
        left?: FlyoutPanelProps;
        preview?: FlyoutPanelProps;
      };
    }
  | {
      type: ActionType.openRightPanel;
      payload: FlyoutPanelProps;
    }
  | {
      type: ActionType.openLeftPanel;
      payload: FlyoutPanelProps;
    }
  | {
      type: ActionType.openPreviewPanel;
      payload: FlyoutPanelProps;
    }
  | {
      type: ActionType.closeRightPanel;
    }
  | {
      type: ActionType.closeLeftPanel;
    }
  | {
      type: ActionType.closePreviewPanel;
    }
  | {
      type: ActionType.previousPreviewPanel;
    }
  | {
      type: ActionType.closeFlyout;
    };
