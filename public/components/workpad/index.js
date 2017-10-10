import { connect } from 'react-redux';
import { get } from 'lodash';
import { undoHistory, redoHistory } from '../../state/actions/history';
import { fetchAllRenderables } from '../../state/actions/elements';
import { getElements, getPageById, getSelectedPage, getWorkpad } from '../../state/selectors/workpad';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import { nextPage, previousPage } from '../../state/actions/pages';
import { Workpad as Component } from './workpad';

const mapStateToProps = (state) => {
  return {
    elements: getElements(state),
    style: get(getPageById(state, getSelectedPage(state)), 'style'),
    workpad: getWorkpad(state),
    isFullscreen: getFullscreen(state),
    isEditing: getEditing(state),
  };
};

const mapDispatchToProps = {
  undoHistory,
  redoHistory,
  nextPage,
  previousPage,
  fetchAllRenderables,
};

export const Workpad = connect(mapStateToProps, mapDispatchToProps)(Component);
