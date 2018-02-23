import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { compose, withState, getContext, withHandlers } from 'recompose';
import { getEditing } from '../../state/selectors/app';
import { addElement, duplicateElement, elementLayer } from '../../state/actions/elements';
import { getAssets } from '../../state/selectors/assets';
import {
  getWorkpad,
  getSelectedPage,
  getSelectedElement,
  getSelectedPageIndex,
} from '../../state/selectors/workpad';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = state => ({
  editing: getEditing(state),
  workpadId: getWorkpad(state).id,
  totalPages: getWorkpad(state).pages.length,
  selectedPage: getSelectedPage(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  selectedElement: getSelectedElement(state),
  hasAssets: Object.keys(getAssets(state)).length ? true : false,
});

const mapDispatchToProps = dispatch => ({
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
  duplicateElement: (pageId, element) => () => dispatch(duplicateElement(element, pageId)),
  elementLayer: (pageId, element) => movement =>
    dispatch(
      elementLayer({
        pageId,
        elementId: element.id,
        movement,
      })
    ),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { selectedElement, selectedPage } = stateProps;

  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    elementIsSelected: Boolean(selectedElement),
    addElement: dispatchProps.addElement(selectedPage),
    duplicateElement: dispatchProps.duplicateElement(selectedPage, selectedElement),
    elementLayer: dispatchProps.elementLayer(selectedPage, selectedElement),
  };
};

export const Toolbar = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  getContext({
    router: PropTypes.object,
  }),
  withHandlers({
    nextPage: props => () => {
      const pageNumber = Math.min(props.selectedPageNumber + 1, props.totalPages);
      props.router.navigateTo('loadWorkpad', { id: props.workpadId, page: pageNumber });
    },
    previousPage: props => () => {
      const pageNumber = Math.max(1, props.selectedPageNumber - 1);
      props.router.navigateTo('loadWorkpad', { id: props.workpadId, page: pageNumber });
    },
  }),
  withState('tray', 'setTray', props => props.tray)
)(Component);
