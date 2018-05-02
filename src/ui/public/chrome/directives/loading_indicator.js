import 'ngreact';
import React from 'react';
import classNames from 'classnames';

import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';

import './loading_indicator.less';

export class LoadingIndicator extends React.Component {
  state = {
    visible: false,
  }

  componentDidMount() {
    this._unsub = chrome.loadingCount.subscribe((count) => {
      this.setState({
        visible: count > 0
      });
    });
  }

  componentWillUnmount() {
    this._unsub();
    this._unsub = null;
  }

  render() {
    const className = classNames(
      'loadingIndicator',
      this.state.visible ? null : 'hidden'
    );

    const testSubj = this.state.visible
      ? 'globalLoadingIndicator'
      : 'globalLoadingIndicator-hidden';

    return (
      <div className={className} data-test-subj={testSubj}>
        <div className="loadingIndicator__bar" />
      </div>
    );
  }
}

uiModules
  .get('app/kibana', ['react'])
  .directive('kbnLoadingIndicator', reactDirective => reactDirective(LoadingIndicator));
