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

import { ErrorEmbeddable, IEmbeddable } from 'plugins/embeddable_api';

import { Subscription } from 'rxjs';
import { EmbeddablePanel } from '../panel';
import { IContainer } from './i_container';

export interface EmbeddableChildPanelUiProps {
  intl: InjectedIntl;
  embeddableId: string;
  className?: string;
  container: IContainer;
}

interface State {
  loading: boolean;
}

/**
 * This component can be used by embeddable containers using react to easily render children. It waits
 * for the child to be initialized, showing a loading indicator until that is complete.
 */

class EmbeddableChildPanelUi extends React.Component<EmbeddableChildPanelUiProps, State> {
  [panel: string]: any;
  public mounted: boolean;
  public embeddable!: IEmbeddable | ErrorEmbeddable;
  private subscription?: Subscription;

  constructor(props: EmbeddableChildPanelUiProps) {
    super(props);
    this.state = {
      loading: true,
    };

    this.mounted = false;
  }

  public async componentDidMount() {
    this.mounted = true;
    const { container } = this.props;

    this.embeddable = await container.untilEmbeddableLoaded(this.props.embeddableId);
    if (this.mounted) {
      this.setState({ loading: false });
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  public render() {
    const classes = classNames('embPanel embPanel__content', {
      'embPanel__content-isLoading': this.state.loading,
    });

    return (
      <div id="embeddedPanel" className={classes}>
        {this.state.loading || !this.embeddable ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <EmbeddablePanel embeddable={this.embeddable} />
        )}
      </div>
    );
  }
}

export const EmbeddableChildPanel = injectI18n(EmbeddableChildPanelUi);
