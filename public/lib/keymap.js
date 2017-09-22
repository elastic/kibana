const undoCombo = 'ctrl+z';
const redoCombo = 'ctrl+shift+y';

export const keymap = {
  WORKPAD: {
    UNDO: {
      osx: 'meta+z',
      windows: undoCombo,
      linux: undoCombo,
      other: undoCombo,
    },
    REDO: {
      osx: 'meta+shift+z',
      windows: redoCombo,
      linux: redoCombo,
      other: redoCombo,
    },
  },
  ELEMENT: {
    DELETE: 'del',
  },
  PRESENTATION: {
    NEXT: ['space', 'right'],
    PREV: 'left',
  },
};
