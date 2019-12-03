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

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { IEmbeddable, EmbeddableInput } from './i_embeddable';
import { EmbeddableRoot } from './embeddable_root';
import { GetEmbeddableFactory } from '../types';

interface Props {
  type: string;
  getEmbeddableFactory: GetEmbeddableFactory;
  input: EmbeddableInput;
}

interface State {
  loading: boolean;
  error?: string;
}

export class EmbeddableFactoryRenderer extends React.Component<Props, State> {
  private embeddable?: IEmbeddable;

  constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
      error: undefined,
    };
  }

  public componentDidMount() {
    const factory = this.props.getEmbeddableFactory(this.props.type);

    if (factory === undefined) {
      this.setState({
        loading: false,
        error: i18n.translate('embeddable.errors.factoryDoesNotExist', {
          defaultMessage:
            'Embeddable factory of {type} does not exist. Ensure all neccessary plugins are installed and enabled.',
          values: {
            type: this.props.type,
          },
        }),
      });
      return;
    }

    factory.create(this.props.input).then(embeddable => {
      this.embeddable = embeddable;
      this.setState({ loading: false });
    });
  }

  public render() {
    return (
      <EmbeddableRoot
        embeddable={this.embeddable}
        loading={this.state.loading}
        error={this.state.error}
      />
    );
  }
}
