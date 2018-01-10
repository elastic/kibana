import { connect } from 'react-redux';
import { selectElement } from '../../state/actions/transient';
import { getEditing, getAppReady } from '../../state/selectors/app';

import { App as Component } from './app';

const mapStateToProps = state => {
  const appReady = getAppReady(state);

  return {
    editing: getEditing(state),
    appReady: typeof appReady === 'object' ? appReady : { ready: appReady },
  };
};

const mapDispatchToProps = dispatch => ({
  deselectElement(ev) {
    ev && ev.stopPropagation();
    dispatch(selectElement(null));
  },
});

export const App = connect(mapStateToProps, mapDispatchToProps)(Component);
