import { compose, withState } from 'recompose';

import { ColorPickerMini as Component } from './color_picker_mini';

export const ColorPickerMini = compose(
  withState('popover', 'setPopover'),
  withState('target', 'setTarget'),
)(Component);
