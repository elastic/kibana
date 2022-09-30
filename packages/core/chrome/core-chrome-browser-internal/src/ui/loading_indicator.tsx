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
import type { Subscription } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';

import './loading_indicator.scss';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
  customLogo?: string;
}

export class LoadingIndicator extends React.Component<
  LoadingIndicatorProps,
  { visible: boolean; customLogo: string | undefined }
> {
  public static defaultProps = { showAsBar: false };

  private loadingCountSubscription?: Subscription;
  // private customLogoSubscription?: Subscription;

  state = {
    visible: false,
    customLogo: undefined,
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
    /*  if (this.props.customLogo$) {
      this.customLogoSubscription = this.props.customLogo$.subscribe((customLogo) => {
        debugger;
        this.setState({ ...this.state, customLogo });
      });
    }*/
  }

  componentWillUnmount() {
    if (this.loadingCountSubscription) {
      clearTimeout(this.timer);
      this.loadingCountSubscription.unsubscribe();
      this.loadingCountSubscription = undefined;
    }
    /* if (this.customLogoSubscription) {
      this.customLogoSubscription.unsubscribe();
      this.customLogoSubscription = undefined;
    }*/
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
      <EuiIcon
        type={this.props.customLogo ? this.props.customLogo : 'logoElastic'}
        size="l"
        data-test-subj={testSubj}
        className="chrHeaderLogo__cluster"
        aria-label={i18n.translate('core.ui.chrome.headerGlobalNav.logoAriaLabel', {
          defaultMessage: 'Elastic Logo',
        })}
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
