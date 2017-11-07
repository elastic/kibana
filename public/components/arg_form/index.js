import PropTypes from 'prop-types';
import { compose, withState } from 'recompose';
import { ArgForm as Component } from './arg_form';

export const ArgForm = compose(
  withState('label', 'setLabel', ({ label, argTypeInstance }) => {
    return label || argTypeInstance.displayName || argTypeInstance.name;
  }),
  withState('expand', 'setExpand', ({ argTypeInstance }) => argTypeInstance.expanded),
)(Component);

ArgForm.propTypes = {
  label: PropTypes.string,
  argTypeInstance: PropTypes.object.isRequired,
};
