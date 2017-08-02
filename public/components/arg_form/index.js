import { compose, withState } from 'recompose';

import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ arg }) => arg.displayName || arg.name),
  withState('expand', 'setExpand', ({ arg }) => arg.expanded)

)(Component);
