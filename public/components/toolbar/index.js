import { connect } from 'react-redux';
import { compose, withState } from 'recompose';

import { getEditing } from '../../state/selectors/app';
import { getSelectedPage, getSelectedElement, getSelectedElementId, getSelectedPageIndex } from '../../state/selectors/workpad';
import { addElement, elementLayer } from '../../state/actions/elements';
import { nextPage, previousPage } from '../../state/actions/pages';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
  selectedPage: getSelectedPage(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  elementIsSelected: getSelectedElement(state) ? true : false,
  selectedElementId: getSelectedElementId(state),
});

const mapDispatchToProps = (dispatch) => ({
  addElement: pageId => partialElement => dispatch(addElement(pageId, partialElement)),
  nextPage: () => dispatch(nextPage()),
  previousPage: () => dispatch(previousPage()),
  elementLayer: (pageId, elementId) => (movement) => dispatch(elementLayer({ pageId, elementId, movement })),

});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    addElement: dispatchProps.addElement(stateProps.selectedPage),
    elementLayer: dispatchProps.elementLayer(stateProps.selectedPage, stateProps.selectedElementId),
  };
};

export const Toolbar = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('tray', 'setTray', props => props.tray),
)(Component);
