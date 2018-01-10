import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import { get } from 'lodash';
import { undoHistory, redoHistory } from '../../state/actions/history';
import { fetchAllRenderables } from '../../state/actions/elements';
import { getPageById, getSelectedPage, getWorkpad, getPages } from '../../state/selectors/workpad';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import { nextPage, previousPage } from '../../state/actions/pages';
import { Workpad as Component } from './workpad';

const mapStateToProps = state => {
  return {
    pages: getPages(state),
    selectedPageId: getSelectedPage(state),
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

export const Workpad = compose(
  withState('grid', 'setGrid', false),
  connect(mapStateToProps, mapDispatchToProps)
)(Component);
