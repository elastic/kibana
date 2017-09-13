import { connect } from 'react-redux';
import { get } from 'lodash';
import { undoHistory, redoHistory } from '../../state/actions/history.js';
import { getElements, getPageById, getSelectedPage, getWorkpad } from '../../state/selectors/workpad';
import { Workpad as Component } from './workpad';

const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
    style: get(getPageById(state, getSelectedPage(state)), 'style'),
    workpad: getWorkpad(state),
  };
};

const mapDispatchToProps = {
  undoHistory,
  redoHistory,
};

export const Workpad = connect(mapStateToProps, mapDispatchToProps)(Component);
