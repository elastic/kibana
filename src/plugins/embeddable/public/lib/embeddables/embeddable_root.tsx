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
import { EuiText } from '@elastic/eui';
import { IEmbeddable } from './i_embeddable';

interface Props {
  embeddable?: IEmbeddable;
  loading?: boolean;
  error?: string;
}

export class EmbeddableRoot extends React.Component<Props> {
  private root?: React.RefObject<HTMLDivElement>;
  private alreadyMounted: boolean = false;

  constructor(props: Props) {
    super(props);

    this.root = React.createRef();
  }

  public componentDidMount() {
    if (this.root && this.root.current && this.props.embeddable) {
      this.alreadyMounted = true;
      this.props.embeddable.render(this.root.current);
    }
  }

  public componentDidUpdate() {
    if (this.root && this.root.current && this.props.embeddable && !this.alreadyMounted) {
      this.alreadyMounted = true;
      this.props.embeddable.render(this.root.current);
    }
  }

  public shouldComponentUpdate(newProps: Props) {
    return !!(
      !_.isEqual(newProps, this.props) ||
      (this.root && this.root.current && newProps.embeddable && !this.alreadyMounted)
    );
  }

  public render() {
    return (
      <React.Fragment>
        <div ref={this.root} />
        {this.props.loading && <EuiLoadingSpinner data-test-subj="embedSpinner" />}
        {this.props.error && <EuiText data-test-subj="embedError">{this.props.error}</EuiText>}
      </React.Fragment>
    );
  }
}
