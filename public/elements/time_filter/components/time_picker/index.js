import { compose, withState, lifecycle } from 'recompose';
import { TimePicker as Component } from './time_picker';

export const TimePicker = compose(
  withState('range', 'setRange', ({ from, to }) => ({ from, to })),
  withState('dirty', 'setDirty', false),
  lifecycle({
    componentWillReceiveProps({ from, to }) {
      if (from !== this.props.from || to !== this.props.to) {
        this.props.setRange({ from, to });
        this.props.setDirty(false);
      }
    },
  })
)(Component);
