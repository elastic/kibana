import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { ArgTypesComponent } from './arg_types_component';
import { ElementNotSelected } from './element_not_selected';

const branches = [
  // rendered when no arg chain is provided
  branch(props => !props.element, renderComponent(ElementNotSelected)),
];

export const ArgTypes = compose(
  ...branches
)(ArgTypesComponent);

ArgTypes.propTypes = {
  element: PropTypes.object,
};
