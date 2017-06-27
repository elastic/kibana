import { connect } from 'react-redux';
import { get } from 'lodash';
import { Workpad as Component } from './workpad';
import { getElements, getPageById, getSelectedPage, getWorkpad } from '../../state/selectors/workpad';
import { selectElement } from '../../state/actions/transient';

const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
    style: get(getPageById(state, getSelectedPage(state)), 'style'),
    workpad: getWorkpad(state),
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
