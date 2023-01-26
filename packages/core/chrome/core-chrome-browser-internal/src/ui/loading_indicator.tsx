/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner, EuiProgress, EuiIcon, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import classNames from 'classnames';
import type { Subscription } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';

import './loading_indicator.scss';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
  customLogo?: string;
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

    const ariaHidden = !this.state.visible;

    const ariaLabel = i18n.translate('core.ui.loadingIndicatorAriaLabel', {
      defaultMessage: 'Loading content',
    });

    const logoImage = this.props.customLogo ? (
      <EuiImage
        src={this.props.customLogo}
        size={24}
        alt="logo"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.customLogoAriaLabel', {
          defaultMessage: 'User logo',
        })}
      />
    ) : (
      <EuiIcon
        type={'logoElastic'}
        size="l"
        data-test-subj={testSubj}
        className="chrHeaderLogo__cluster"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.logoAriaLabel', {
          defaultMessage: 'Elastic Logo',
        })}
      />
    );

    const logo = this.state.visible ? (
      <EuiLoadingSpinner
        size="l"
        data-test-subj={testSubj}
        aria-hidden={false}
        aria-label={ariaLabel}
      />
    ) : (
      logoImage
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
