import React from 'react';
import PropTypes from 'prop-types';
import { routes } from '../../apps';
import { LOCALSTORAGE_LASTPAGE } from '../../../common/lib/constants';
import { shortcutManager } from '../../lib/shortcut_manager';
import { storage } from '../../lib/storage';
import { UpdateModal } from '../update_modal';
import { Router } from '../router';

export class App extends React.PureComponent {
  static childContextTypes = {
    shortcuts: PropTypes.object.isRequired,
  };

  static propTypes = {
    appState: PropTypes.object.isRequired,
    setAppReady: PropTypes.func.isRequired,
    setAppError: PropTypes.func.isRequired,
  };

  getChildContext() {
    return { shortcuts: shortcutManager };
  }

  renderError = () => {
    console.error(this.props.appState);

    return (
      <div>
        <div>Canvas failed to load :(</div>
        <div>Message: {this.props.appState.message}</div>
      </div>
    );
  };

  onRouteChange = pathname => {
    storage.set(LOCALSTORAGE_LASTPAGE, pathname);
  };

  render() {
    if (this.props.appState instanceof Error) return this.renderError();

    const restoreRoute = storage.get(LOCALSTORAGE_LASTPAGE);

    return (
      <div className="canvas">
        <UpdateModal />
        <Router
          routes={routes}
          restoreRoute={restoreRoute}
          showLoading={this.props.appState.ready === false}
          loadingMessage="Canvas is loading"
          onRouteChange={this.onRouteChange}
          onLoad={() => this.props.setAppReady(true)}
          onError={err => this.props.setAppError(err)}
        />
      </div>
    );
  }
}
