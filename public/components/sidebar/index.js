import { connect } from 'react-redux';
import { duplicateElement, elementLayer } from '../../state/actions/elements';
import { getSelectedPage, getSelectedElement } from '../../state/selectors/workpad';

import { Sidebar as Component } from './sidebar';

const mapStateToProps = state => ({
  selectedPage: getSelectedPage(state),
  selectedElement: getSelectedElement(state),
});

const mapDispatchToProps = dispatch => ({
  duplicateElement: (pageId, selectedElement) => () =>
    dispatch(duplicateElement(selectedElement, pageId)),
  elementLayer: (pageId, selectedElement) => movement =>
    dispatch(
      elementLayer({
        pageId,
        elementId: selectedElement.id,
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
    duplicateElement: dispatchProps.duplicateElement(selectedPage, selectedElement),
    elementLayer: dispatchProps.elementLayer(selectedPage, selectedElement),
  };
};

export const Sidebar = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
