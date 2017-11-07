import { withState, compose } from 'recompose';
import { FeedbackButton as Component } from './feedback_button';

export const FeedbackButton = compose(
  withState('show', 'setShow', null),
)(Component);
