import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, getContext, withHandlers } from 'recompose';
import { undoHistory, redoHistory } from '../../state/actions/history';
import { fetchAllRenderables } from '../../state/actions/elements';
import { getFullscreen, getEditing } from '../../state/selectors/app';
import {
  getSelectedPage,
  getSelectedPageIndex,
  getAllElements,
  getWorkpad,
  getPages,
} from '../../state/selectors/workpad';
import { Workpad as Component } from './workpad';

const mapStateToProps = state => ({
  pages: getPages(state),
  selectedPageId: getSelectedPage(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  totalElementCount: getAllElements(state).length,
  workpad: getWorkpad(state),
  isFullscreen: getFullscreen(state),
  isEditing: getEditing(state),
});

const mapDispatchToProps = {
  undoHistory,
  redoHistory,
  fetchAllRenderables,
};

export const Workpad = compose(
  getContext({
    router: PropTypes.object,
  }),
  withState('grid', 'setGrid', false),
  connect(mapStateToProps, mapDispatchToProps),
  withHandlers({
    nextPage: props => () => {
      const pageNumber = Math.min(props.selectedPageNumber + 1, props.workpad.pages.length);
      props.router.navigateTo('loadWorkpad', { id: props.workpad.id, page: pageNumber });
    },
    previousPage: props => () => {
      const pageNumber = Math.max(1, props.selectedPageNumber - 1);
      props.router.navigateTo('loadWorkpad', { id: props.workpad.id, page: pageNumber });
    },
  })
)(Component);
