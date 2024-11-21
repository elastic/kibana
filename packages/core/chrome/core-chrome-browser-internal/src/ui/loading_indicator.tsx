/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Global, css } from '@emotion/react';
import { EuiLoadingSpinner, EuiProgress, EuiIcon, EuiImage } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import classNames from 'classnames';
import type { Subscription } from 'rxjs';
import type { HttpStart } from '@kbn/core-http-browser';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
  customLogo?: string;
  maxAmount?: number;
  valueAmount?: string | number;
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
    const indicatorHiddenCss = !this.state.visible
      ? css({
          visibility: 'hidden',
          animationPlayState: 'paused',
        })
      : undefined;

    const testSubj = this.state.visible
      ? 'globalLoadingIndicator'
      : 'globalLoadingIndicator-hidden';

    const ariaLabel = i18n.translate('core.ui.loadingIndicatorAriaLabel', {
      defaultMessage: 'Loading content',
    });

    const logoImage = this.props.customLogo ? (
      <EuiImage
        src={this.props.customLogo}
        data-test-subj={testSubj}
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

    return (
      <>
        <Global
          styles={{
            '.euiHeaderSectionItem .euiButtonEmpty__text': {
              // stop global header buttons from jumping during loading state
              display: 'flex',
            },
          }}
        />
        {!this.props.showAsBar ? (
          logo
        ) : (
          <EuiProgress
            className={className}
            css={indicatorHiddenCss}
            data-test-subj={testSubj}
            max={this.props.maxAmount}
            value={this.props.valueAmount}
            position="fixed"
            color="accent"
            size="xs"
          />
        )}
      </>
    );
  }
}
