/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createRef, Component } from 'react';

import {
  ChromeBreadcrumb,
  AppMountParameters,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import classNames from 'classnames';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { ThrowIfError } from '@kbn/shared-ux-error-boundary';
import { ManagementApp } from '../../utils';
import { Unmount } from '../../types';

interface ManagementSectionWrapperProps {
  app: ManagementApp;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], history?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  history: AppMountParameters['history'];
  theme: ThemeServiceStart;
}

interface ManagementSectionWrapperState {
  error: Error | null;
}

export class ManagementAppWrapper extends Component<
  ManagementSectionWrapperProps,
  ManagementSectionWrapperState
> {
  private unmount?: Unmount;
  private mountElementRef = createRef<HTMLDivElement>();

  constructor(props: ManagementSectionWrapperProps) {
    super(props);
    this.state = { error: null };
  }

  componentDidMount() {
    const { setBreadcrumbs, app, onAppMounted, history, theme } = this.props;
    const { mount, basePath } = app;
    const appHistory = history.createSubHistory(app.basePath);

    // TODO: Remove this: it provides a deprecated field still needed in ManagementAppMountParams
    const { theme$ } = theme;

    const mountResult = mount({
      basePath,
      setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => setBreadcrumbs(crumbs, appHistory),
      element: this.mountElementRef.current!,
      history: appHistory,
      theme,
      theme$,
    });

    onAppMounted(app.id);

    if (mountResult instanceof Promise) {
      mountResult
        .then((um) => {
          this.unmount = um;
        })
        .catch((error) => {
          this.setState(() => ({
            error,
          }));
        });
    } else {
      this.unmount = mountResult;
    }
  }

  async componentWillUnmount() {
    if (this.unmount) {
      await this.unmount();
    }
  }

  render() {
    return (
      <>
        <ThrowIfError error={this.state.error} />
        <div
          // The following classes are a stop-gap for this element that wraps children of KibanaPageTemplate
          className={classNames('euiPageContentBody', APP_WRAPPER_CLASS)}
          ref={this.mountElementRef}
        />
      </>
    );
  }
}
