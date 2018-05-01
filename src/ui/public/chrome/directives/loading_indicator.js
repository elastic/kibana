import 'ngreact';
import React from 'react';
import classNames from 'classnames';

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

import './loading_indicator.less';

class LoadingIndicator extends React.Component {
  state = {
    hidden: false,
    error: null
  }

  componentDidMount() {
    this._sub = chrome.loadingCount.count$.subscribe({
      next: (count) => {
        this.setState({
          hidden: count === 0
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
    const { error, hidden } = this.state;

    if (error) {
      throw error;
    }

    return (
      <div
        className={classNames('loadingIndicator', hidden && 'hidden')}
        data-test-subj={
          hidden
            ? 'globalLoadingIndicator-hidden'
            : 'globalLoadingIndicator'
        }
      >
        <div className="loadingIndicator__bar" />
      </div>
    );
  }
}

uiModules
  .get('app/kibana', ['react'])
  .directive('kbnLoadingIndicator', reactDirective => reactDirective(LoadingIndicator));
