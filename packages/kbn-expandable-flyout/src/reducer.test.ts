/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlyoutPanel } from './types';
import { initialState, reducer, State } from './reducer';
import { Action, ActionType } from './actions';

const rightPanel1: FlyoutPanel = {
  id: 'right1',
  path: ['path'],
};
const leftPanel1: FlyoutPanel = {
  id: 'left1',
  params: { id: 'id' },
};
const previewPanel1: FlyoutPanel = {
  id: 'preview1',
  state: { id: 'state' },
};

const rightPanel2: FlyoutPanel = {
  id: 'right2',
  path: ['path'],
};
const leftPanel2: FlyoutPanel = {
  id: 'left2',
  params: { id: 'id' },
};
const previewPanel2: FlyoutPanel = {
  id: 'preview2',
  state: { id: 'state' },
};
describe('reducer', () => {
  describe('should handle openFlyout action', () => {
    it('should add panels to empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.openFlyout,
        payload: {
          right: rightPanel1,
          left: leftPanel1,
          preview: previewPanel1,
        },
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      });
    });

    it('should override all panels in the state', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1, { id: 'preview' }],
      };
      const action: Action = {
        type: ActionType.openFlyout,
        payload: {
          right: rightPanel2,
          left: leftPanel2,
          preview: previewPanel2,
        },
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel2,
        right: rightPanel2,
        preview: [previewPanel2],
      });
    });

    it('should remove all panels despite only passing a single section ', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.openFlyout,
        payload: {
          right: rightPanel2,
        },
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: undefined,
        right: rightPanel2,
        preview: [],
      });
    });
  });

  describe('should handle openRightPanel action', () => {
    it('should add right panel to empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.openRightPanel,
        payload: rightPanel1,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: undefined,
        right: rightPanel1,
        preview: [],
      });
    });

    it('should replace right panel', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.openRightPanel,
        payload: rightPanel2,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: rightPanel2,
        preview: [previewPanel1],
      });
    });
  });

  describe('should handle openLeftPanel action', () => {
    it('should add left panel to empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.openLeftPanel,
        payload: leftPanel1,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: undefined,
        preview: [],
      });
    });

    it('should replace only left panel', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.openLeftPanel,
        payload: leftPanel2,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel2,
        right: rightPanel1,
        preview: [previewPanel1],
      });
    });
  });

  describe('should handle openPreviewPanel action', () => {
    it('should add preview panel to empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.openPreviewPanel,
        payload: previewPanel1,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: undefined,
        right: undefined,
        preview: [previewPanel1],
      });
    });

    it('should add preview panel to the list of preview panels', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.openPreviewPanel,
        payload: previewPanel2,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1, previewPanel2],
      });
    });
  });

  describe('should handle closeRightPanel action', () => {
    it('should return empty state when removing right panel from empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.closeRightPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it(`should return unmodified state when removing right panel when no right panel exist`, () => {
      const state: State = {
        left: leftPanel1,
        right: undefined,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.closeRightPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should remove right panel', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.closeRightPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: undefined,
        preview: [previewPanel1],
      });
    });
  });

  describe('should handle closeLeftPanel action', () => {
    it('should return empty state when removing left panel on empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.closeLeftPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it(`should return unmodified state when removing left panel when no left panel exist`, () => {
      const state: State = {
        left: undefined,
        right: rightPanel1,
        preview: [],
      };
      const action: Action = {
        type: ActionType.closeLeftPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should remove left panel', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.closeLeftPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: undefined,
        right: rightPanel1,
        preview: [previewPanel1],
      });
    });
  });

  describe('should handle closePreviewPanel action', () => {
    it('should return empty state when removing preview panel on empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.closePreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it(`should return unmodified state when removing preview panel when no preview panel exist`, () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [],
      };
      const action: Action = {
        type: ActionType.closePreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should remove all preview panels', () => {
      const state: State = {
        left: rightPanel1,
        right: leftPanel1,
        preview: [previewPanel1, previewPanel2],
      };
      const action: Action = {
        type: ActionType.closePreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: rightPanel1,
        right: leftPanel1,
        preview: [],
      });
    });
  });

  describe('should handle previousPreviewPanel action', () => {
    it('should return empty state when previous preview panel on an empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.previousPreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it(`should return unmodified state when previous preview panel when no preview panel exist`, () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [],
      };
      const action: Action = {
        type: ActionType.previousPreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(state);
    });

    it('should remove only last preview panel', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1, previewPanel2],
      };
      const action: Action = {
        type: ActionType.previousPreviewPanel,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      });
    });
  });

  describe('should handle closeFlyout action', () => {
    it('should return empty state when closing flyout on an empty state', () => {
      const state: State = initialState;
      const action: Action = {
        type: ActionType.closeFlyout,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual(initialState);
    });

    it('should remove all panels', () => {
      const state: State = {
        left: leftPanel1,
        right: rightPanel1,
        preview: [previewPanel1],
      };
      const action: Action = {
        type: ActionType.closeFlyout,
      };
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        left: undefined,
        right: undefined,
        preview: [],
      });
    });
  });
});
