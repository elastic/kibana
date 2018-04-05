import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { compose, withState, lifecycle } from 'recompose';
import { getWorkpadInfo } from '../../state/selectors/workpad';
import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ label, argTypeInstance }) => {
    return label || argTypeInstance.displayName || argTypeInstance.name;
  }),
  withState('expand', 'setExpand', ({ argTypeInstance }) => argTypeInstance.expanded),
  withState('renderError', 'setRenderError', false),
  lifecycle({
    componentWillUpdate(prevProps) {
      if (prevProps.templateProps.argValue !== this.props.templateProps.argValue)
        this.props.setRenderError(false);
    },
  }),
  connect(state => ({ workpad: getWorkpadInfo(state) }))
)(Component);

ArgForm.propTypes = {
  label: PropTypes.string,
  argTypeInstance: PropTypes.object.isRequired,
};
