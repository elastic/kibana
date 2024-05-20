/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FlyoutPanelProps } from './types';
import { reducer } from './reducer';
import { initialState, State } from './state';
import {
  closeLeftPanelAction,
  closePanelsAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  openLeftPanelAction,
  openPanelsAction,
  openPreviewPanelAction,
  openRightPanelAction,
  previousPreviewPanelAction,
} from './actions';

const id1 = 'id1';
const id2 = 'id2';
const rightPanel1: FlyoutPanelProps = {
  id: 'right1',
  path: { tab: 'tab' },
};
const leftPanel1: FlyoutPanelProps = {
  id: 'left1',
  params: { id: 'id' },
};
const previewPanel1: FlyoutPanelProps = {
  id: 'preview1',
  state: { id: 'state' },
};

const rightPanel2: FlyoutPanelProps = {
  id: 'right2',
  path: { tab: 'tab' },
};
const leftPanel2: FlyoutPanelProps = {
  id: 'left2',
  params: { id: 'id' },
};
const previewPanel2: FlyoutPanelProps = {
  id: 'preview2',
  state: { id: 'state' },
};
describe('reducer', () => {
  describe('should handle openFlyout action', () => {
    it('should add panels to empty state', () => {
      const state: State = initialState;
      const action = openPanelsAction({
        right: rightPanel1,
        left: leftPanel1,
        preview: previewPanel1,
        id: id1,
      });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should override all panels in the state', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1, { id: 'preview' }],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        left: leftPanel2,
        preview: previewPanel2,
        id: id1,
      });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel2,
            right: rightPanel2,
            preview: [previewPanel2],
          },
        },
        needsSync: true,
      });
    });

    it('should remove all panels despite only passing a single section ', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        id: id1,
      });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });

    it('should add panels to a new key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openPanelsAction({
        right: rightPanel2,
        id: id2,
      });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
          [id2]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openRightPanel action', () => {
    it('should add right panel to empty state', () => {
      const state: State = initialState;
      const action = openRightPanelAction({ right: rightPanel1, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });

    it('should replace right panel', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openRightPanelAction({ right: rightPanel2, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel2,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should add right panel to a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openRightPanelAction({ right: rightPanel2, id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
          [id2]: {
            left: undefined,
            right: rightPanel2,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openLeftPanel action', () => {
    it('should add left panel to empty state', () => {
      const state: State = initialState;
      const action = openLeftPanelAction({ left: leftPanel1, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });

    it('should replace only left panel', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openLeftPanelAction({ left: leftPanel2, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel2,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should add left panel to a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openLeftPanelAction({ left: leftPanel2, id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
          [id2]: {
            left: leftPanel2,
            right: undefined,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle openPreviewPanel action', () => {
    it('should add preview panel to empty state', () => {
      const state: State = initialState;
      const action = openPreviewPanelAction({ preview: previewPanel1, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: undefined,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should add preview panel to the list of preview panels', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openPreviewPanelAction({ preview: previewPanel2, id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1, previewPanel2],
          },
        },
        needsSync: true,
      });
    });

    it('should add preview panel to a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = openPreviewPanelAction({ preview: previewPanel2, id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
          [id2]: {
            left: undefined,
            right: undefined,
            preview: [previewPanel2],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closeRightPanel action', () => {
    it('should return empty state when removing right panel from empty state', () => {
      const state: State = initialState;
      const action = closeRightPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it(`should return unmodified state when removing right panel when no right panel exist`, () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeRightPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it('should remove right panel', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeRightPanelAction({ id: id1 });

      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: undefined,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove right panel for a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeRightPanelAction({ id: id2 });

      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closeLeftPanel action', () => {
    it('should return empty state when removing left panel on empty state', () => {
      const state: State = initialState;
      const action = closeLeftPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it(`should return unmodified state when removing left panel when no left panel exist`, () => {
      const state: State = {
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it('should remove left panel', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove left panel for a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closeLeftPanelAction({ id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closePreviewPanel action', () => {
    it('should return empty state when removing preview panel on empty state', () => {
      const state: State = initialState;
      const action = closePreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it(`should return unmodified state when removing preview panel when no preview panel exist`, () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: undefined,
          },
        },
      };
      const action = closePreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it('should remove all preview panels', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: [previewPanel1, previewPanel2],
          },
        },
      };
      const action = closePreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });

    it('should not remove preview panels for a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closePreviewPanelAction({ id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle previousPreviewPanel action', () => {
    it('should return empty state when previous preview panel on an empty state', () => {
      const state: State = initialState;
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...initialState, needsSync: true });
    });

    it(`should return unmodified state when previous preview panel when no preview panel exist`, () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: undefined,
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...state, needsSync: true });
    });

    it('should remove only last preview panel', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: [previewPanel1, previewPanel2],
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: rightPanel1,
            right: leftPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });

    it('should not remove the last preview panel for a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = previousPreviewPanelAction({ id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });
  });

  describe('should handle closeFlyout action', () => {
    it('should return empty state when closing flyout on an empty state', () => {
      const state: State = initialState;
      const action = closePanelsAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({ ...initialState, needsSync: true });
    });

    it('should remove all panels', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closePanelsAction({ id: id1 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: undefined,
            right: undefined,
            preview: undefined,
          },
        },
        needsSync: true,
      });
    });

    it('should not remove panels for a different key', () => {
      const state: State = {
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
      };
      const action = closePanelsAction({ id: id2 });
      const newState: State = reducer(state, action);

      expect(newState).toEqual({
        byId: {
          [id1]: {
            left: leftPanel1,
            right: rightPanel1,
            preview: [previewPanel1],
          },
        },
        needsSync: true,
      });
    });
  });
});
