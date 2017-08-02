import { connect } from 'react-redux';
import { compose, withState } from 'recompose';

import { getEditing } from '../../state/selectors/app';
import { getSelectedPage, getSelectedElement, getSelectedPageIndex } from '../../state/selectors/workpad';
import { addElement } from '../../state/actions/elements';
import { addPage, nextPage, previousPage } from '../../state/actions/pages';


import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
  selectedPage: getSelectedPage(state),
  selectedPageNumber: getSelectedPageIndex(state) + 1,
  elementIsSelected: getSelectedElement(state) ? true : false,
});

const mapDispatchToProps = (dispatch) => ({
  addElement: pageId => expression => dispatch(addElement(pageId, { expression })),
  addPage: () => dispatch(addPage()),
  nextPage: () => dispatch(nextPage()),
  previousPage: () => dispatch(previousPage()),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    addElement: dispatchProps.addElement(stateProps.selectedPage),
  };
};

export const Toolbar = compose(
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
  withState('tray', 'setTray', props => props.tray),
)(Component);
