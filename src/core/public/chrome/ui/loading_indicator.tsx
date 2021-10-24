/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner, EuiProgress, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import classNames from 'classnames';
import { Subscription } from 'rxjs';

import { HttpStart } from '../../http';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
}

export class LoadingIndicator extends React.Component<LoadingIndicatorProps, { visible: boolean }> {
  public static defaultProps = { showAsBar: false };

  private loadingCountSubscription?: Subscription;

  state = {
    visible: false,
  };

  private timer: any;
  private increment = 1;

  componentDidMount() {
    this.loadingCountSubscription = this.props.loadingCount$.subscribe((count) => {
      if (this.increment > 1) {
        clearTimeout(this.timer);
      }
      this.increment += this.increment;
      this.timer = setTimeout(() => {
        this.setState({
          visible: count > 0,
        });
      }, 250);
    });
  }

  componentWillUnmount() {
    if (this.loadingCountSubscription) {
      clearTimeout(this.timer);
      this.loadingCountSubscription.unsubscribe();
      this.loadingCountSubscription = undefined;
    }
  }

  render() {
    const className = classNames(!this.state.visible && 'kbnLoadingIndicator-hidden');

    const testSubj = this.state.visible
      ? 'globalLoadingIndicator'
      : 'globalLoadingIndicator-hidden';

    const ariaHidden = this.state.visible ? false : true;

    const ariaLabel = i18n.translate('core.ui.loadingIndicatorAriaLabel', {
      defaultMessage: 'Loading content',
    });

    const logo = this.state.visible ? (
      <EuiLoadingSpinner
        size="l"
        data-test-subj={testSubj}
        aria-hidden={false}
        aria-label={ariaLabel}
      />
    ) : (
      <img
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAABSCAMAAAAfMBiXAAAANlBMVEUAAAA3qlw6rF06r1wolFpCt15Ct15Ct146r1xBtl4smVoum1o8r1wii1pCt14plVo8r1w0pVyunFxrAAAADXRSTlMAGXM07Nfxs1iTxZ9MTe3hXAAAAadJREFUWMOtlgtuwzAMQ+VPfnZlb/e/7IK2QDNwiRaZPMADrb4QFXoeiU2MU+cCwza3XpnEtLTWuhKJ69T29F5oj45Tm58tNZAeve28V0vNHHeW9k5XTs04tSMyU9yZj0hNDHeOLfcQ3PlEn1kH3Tnmq7+Yo+5gS42j7mBL9bsDSH2net1ppy111B1sqWXUHWypweHOdUvNN90BFrbUcNcds6VmhzsGUpPDHQOpDncs5MPhjoFUhzsWMt7eHcy3/o7DHaOlVoc7Rks13PEgi9MdfPgn4codV0vNhjsOpAZjdxzI7HIHkdfrsc0OpClSiss8gFxPPYqTE6nXH+V2ze1/IqO9cMjFlve3OKzLZLfE9bD3c5kA6ayJOuDDcT183K4nCe5/m6fILN6sOlwTk4drYuIJMw0wgyES8fHrELPwa0o11sOTNF4TY6wH60eS0VRjPTgHDTIc/CzHk/k1pbJr4t4lYQREYh905TAL1OQeNAopUJN60EpjFn5NibAehMBnyTtoFmIKv6ZEfk0JsB6sgwo3BdaDc1AhJ8B6UA4q9JTKZ/7z5T/2xG2LklAswgAAAABJRU5ErkJggg=="
        alt="logo"
        width="24"
        height="24"
      />
    );

    return !this.props.showAsBar ? (
      logo
    ) : (
      <EuiProgress
        className={className}
        data-test-subj={testSubj}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
        position="fixed"
        color="accent"
        size="xs"
      />
    );
  }
}
