import { compose, withState } from 'recompose';
import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ argTypeInstance }) => argTypeInstance.displayName || argTypeInstance.name),
  withState('expand', 'setExpand', ({ argTypeInstance }) => argTypeInstance.expanded),
)(Component);
