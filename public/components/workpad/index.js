import { connect } from 'react-redux';
import { get } from 'lodash';
import { Workpad as Component } from './workpad';
import { getElements, getPageById, getSelectedPage, getWorkpad } from '../../state/selectors/workpad';


const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
    style: get(getPageById(state, getSelectedPage(state)), 'style'),
    workpad: getWorkpad(state),
  };
};

export const Workpad = connect(mapStateToProps)(Component);
