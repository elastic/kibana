import { connect } from 'react-redux';
import { getAppReady } from '../../state/selectors/app';
import { appReady, appError } from '../../state/actions/app';
import { App as Component } from './app';

const mapStateToProps = state => {
  // appReady could be an error object
  const appState = getAppReady(state);

  return {
    appState: typeof appState === 'object' ? appState : { ready: appState },
  };
};

const mapDispatchToProps = {
  setAppReady: appReady,
  setAppError: appError,
};

export const App = connect(mapStateToProps, mapDispatchToProps)(Component);
