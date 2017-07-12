import { connect } from 'react-redux';

import { setEditing, selectElement } from '../../state/actions/transient';
import { getEditing, getAppReady } from '../../state/selectors/app';

import { App as Component } from './app';

const mapStateToProps = (state) => {
  const appReady = getAppReady(state);

  return {
    editing: getEditing(state),
    appReady: (typeof appReady === 'object') ? appReady : { ready: appReady },
  };
};

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
