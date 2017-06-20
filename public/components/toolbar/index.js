import { connect } from 'react-redux';
import { compose, withState } from 'recompose';

import { getEditing } from '../../state/selectors/app';
import { getSelectedPage } from '../../state/selectors/workpad';
import { addElement } from '../../state/actions/elements';

import { Toolbar as Component } from './toolbar';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
  selectedPage: getSelectedPage(state),
});

const mapDispatchToProps = (dispatch) => ({
  addElement: pageId => expression => dispatch(addElement(expression, pageId)),
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
