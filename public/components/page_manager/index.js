import { connect } from 'react-redux';
import { compose, withState } from 'recompose';
import { PageManager as Component } from './page_manager';
import { addPage, loadPage, movePage, removePage } from '../../state/actions/pages';
import { getSelectedPage, getPages } from '../../state/selectors/workpad';

const mapStateToProps = (state) => ({
  pages: getPages(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch) => ({
  addPage: () => dispatch(addPage()),
  loadPage: (id) => dispatch(loadPage(id)),
  movePage: (id, position) => dispatch(movePage(id, position)),
  removePage: (id) => dispatch(removePage(id)),
});

export const PageManager = compose(
  connect(mapStateToProps, mapDispatchToProps),
  withState('withControls', 'showControls', false)
)(Component);
