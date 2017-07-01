import { connect } from 'react-redux';

import { getEditing } from '../../state/selectors/app';
import { setEditing, selectElement } from '../../state/actions/transient';

import { App as Component } from './app';

const mapStateToProps = (state) => ({
  editing: getEditing(state),
});

const mapDispatchToProps = (dispatch) => ({
  setEditing,
  deselectElement(ev) {
    ev && ev.stopPropagation();
    dispatch(selectElement(null));
  },
});

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  return Object.assign({}, stateProps, dispatchProps, ownProps, {
    toggleEditing: () => dispatchProps.setEditing(!stateProps.editing),
  });
};

export const App = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Component);
