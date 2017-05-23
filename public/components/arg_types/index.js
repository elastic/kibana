import { connect } from 'react-redux';
import { get } from 'lodash';
import { ArgTypes as Component } from './arg_types';
import { getSelectedElement } from '../../state/selectors/workpad';

const mapStateToProps = (state) => {
  const selectedElement = getSelectedElement(state);

  return {
    argTypeChain: get(selectedElement, 'ast.chain'),
  };
};

export const ArgTypes = connect(mapStateToProps)(Component);
