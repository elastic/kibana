import { connect } from 'react-redux';
import { compose, withState } from 'recompose';

import { getEditing } from '../../state/selectors/app';
import { addElement, duplicateElement, elementLayer } from '../../state/actions/elements';
import { nextPage, previousPage } from '../../state/actions/pages';
import { getAssets } from '../../state/selectors/assets';
import {
  getSelectedPage,
  getSelectedElement,
  getSelectedPageIndex,
} from '../../state/selectors/workpad';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
  selectedPage: getSelectedPage(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  selectedElement: getSelectedElement(state),
  hasAssets: Object.keys(getAssets(state)).length ? true : false,
});

const mapDispatchToProps = (dispatch) => ({
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
  nextPage: () => dispatch(nextPage()),
  previousPage: () => dispatch(previousPage()),
  duplicateElement: (pageId, element) => () => dispatch(duplicateElement(element, pageId)),
  elementLayer: (pageId, element) => (movement) => dispatch(elementLayer({
    pageId,
    elementId: element.id,
    movement,
  })),
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
  withState('tray', 'setTray', props => props.tray),
)(Component);
