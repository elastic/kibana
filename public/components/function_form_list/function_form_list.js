import PropTypes from 'prop-types';
import { compose, branch, renderComponent } from 'recompose';
import { FunctionFormListComponent } from './function_form_list_component';
import { ElementNotSelected } from './element_not_selected';

const branches = [
  // rendered when no arg chain is provided
  branch(props => !props.element, renderComponent(ElementNotSelected)),
];

export const FunctionFormList = compose(
  ...branches
)(FunctionFormListComponent);

FunctionFormList.propTypes = {
  element: PropTypes.object,
};
