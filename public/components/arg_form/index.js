import { compose, withState, withHandlers, lifecycle } from 'recompose';
import { RenderError } from '../../lib/errors';
import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ argTypeInstance }) => argTypeInstance.displayName || argTypeInstance.name),
  withState('expand', 'setExpand', ({ argTypeInstance }) => argTypeInstance.expanded),
  withState('error', 'setError', null),
  withHandlers({
    resetErrorState: ({ setError }) => () => setError(null),
  }),
  lifecycle({
    componentDidCatch(err) {
      if (err instanceof RenderError) {
        this.props.setError(err);
      } else {
        throw err;
      }
    },
  })
)(Component);
