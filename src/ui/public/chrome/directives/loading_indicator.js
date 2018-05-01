import 'ngreact';
import React from 'react';

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

import './loading_indicator.less';

class LoadingIndicator extends React.Component {
  state = {
    visible: false,
    error: null
  }

  componentDidMount() {
    this._sub = chrome.loadingCount.count$.subscribe({
      next: (count) => {
        this.setState({
          visible: count > 0
        });
      },
      error: (error) => {
        this.setState({
          error
        });
      }
    });
  }

  componentWillUnmount() {
    this._sub.unsubscribe();
    this._sub = null;
  }

  render() {
    const { error, visible } = this.state;

    if (error) {
      throw error;
    }

    if (!visible) {
      return null;
    }

    return (
      <div
        className="loadingIndicator"
        data-test-subj="globalLoadingIndicator"
      >
        <div className="loadingIndicator__bar" />
      </div>
    );
  }
}

uiModules
  .get('app/kibana', ['react'])
  .directive('kbnLoadingIndicator', reactDirective => reactDirective(LoadingIndicator));
