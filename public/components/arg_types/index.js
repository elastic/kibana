import { connect } from 'react-redux';
import { branch, renderComponent, compose } from 'recompose';
import { get } from 'lodash';
import { ElementNotSelected } from './element_not_selected';
import { ArgTypes as Component } from './arg_types';
import { getElementById, getSelectedElement } from '../../state/selectors/workpad';

const elementNotSelected = branch(
  props => !props.argTypeChain,
  renderComponent(ElementNotSelected)
);

const mapStateToProps = (state) => {
  const selectedElement = getElementById(state, getSelectedElement(state));

  return {
    argTypeChain: get(selectedElement, 'ast.chain'),
  };
};

export const ArgTypes = compose(
  connect(mapStateToProps),
  elementNotSelected
)(Component);
