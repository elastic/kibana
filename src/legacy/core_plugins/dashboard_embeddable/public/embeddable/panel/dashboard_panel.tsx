/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import classNames from 'classnames';
import _ from 'lodash';
import React from 'react';

import { EuiLoadingChart } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';

import { ErrorEmbeddable, IEmbeddable, isErrorEmbeddable } from 'plugins/embeddable_api/index';

import { Subscription } from 'rxjs';
import { DashboardContainer } from '../dashboard_container';

export interface DashboardPanelProps {
  lastReloadRequestTime?: number;
  embeddableId: string;
  className?: string;
  container: DashboardContainer;
}

export interface DashboardPanelUiProps extends DashboardPanelProps {
  intl: InjectedIntl;
}

interface State {
  loading: boolean;
}

class DashboardPanelUi extends React.Component<DashboardPanelUiProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: IEmbeddable | ErrorEmbeddable;
  private subscription?: Subscription;

  constructor(props: DashboardPanelUiProps) {
    super(props);
    this.state = {
      loading: true,
    };

    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.container.getOutput$().subscribe(() => {
      if (!this.embeddable) {
        this.renderEmbeddable();
      }
    });
    if (!this.embeddable) {
      this.renderEmbeddable();
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (
      this.embeddable &&
      !isErrorEmbeddable(this.embeddable) &&
      this.props.container.getChild(this.embeddable.id)
    ) {
      this.props.container.removeEmbeddable(this.embeddable.id);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public renderEmbeddableViewport() {
    const classes = classNames('embPanel panel-content', {
      'panel-content-isLoading': this.state.loading,
    });

    return (
      <div
        id="embeddedPanel"
        data-test-subj="dashboardPanel"
        className={classes}
        ref={panelElement => (this.panelElement = panelElement)}
      >
        {this.state.loading && <EuiLoadingChart size="l" mono />}
      </div>
    );
  }

  // public shouldComponentUpdate(nextProps: DashboardPanelUiProps) {
  //   // if (this.embeddable && nextProps.lastReloadRequestTime !== this.props.lastReloadRequestTime) {
  //   //   this.embeddable.reload();
  //   // }

  //   return true;
  // }

  public render() {
    return this.renderEmbeddableViewport();
  }

  private renderEmbeddable() {
    this.embeddable = this.props.container.getChild(this.props.embeddableId);
    if (this.mounted && this.embeddable) {
      this.setState({ loading: false }, () => {
        this.embeddable.renderInPanel(this.panelElement);
      });
    } else if (this.embeddable) {
      this.embeddable.destroy();
    }
  }
}

export const DashboardPanel = injectI18n(DashboardPanelUi);
