import { compose, withState } from 'recompose';
import { PillSelect as Component } from './pill_select';

export const PillSelect = compose(
  withState('popover', 'setPopover'),
  withState('target', 'setTarget'),
  withState('search', 'setSearch', '')
)(Component);
