import { compose, withState, lifecycle } from 'recompose';
import { DatetimeInput as Component } from './datetime_input';

export const DatetimeInput = compose(
  withState('valid', 'setValid', () => true),
  withState('strValue', 'setStrValue', ({ moment }) => moment.format('YYYY-MM-DD HH:mm:ss')),
  lifecycle({
    componentWillReceiveProps({ moment, setStrValue, setValid }) {
      if (this.props.moment.isSame(moment)) return;
      setStrValue(moment.format('YYYY-MM-DD HH:mm:ss'));
      setValid(true);
    },
  })
)(Component);
