import { connect } from 'react-redux';
import { Workpad as Component } from './workpad';
import { getElements } from '../../state/selectors/workpad';
import { selectElement } from '../../state/actions/transient';

const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    deselectElement(ev) {
      ev && ev.stopPropagation();
      dispatch(selectElement(null));
    },
  };
};

export const Workpad = connect(mapStateToProps, mapDispatchToProps)(Component);
