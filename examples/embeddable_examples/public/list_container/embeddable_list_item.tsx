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
import { EuiPanel, EuiLoadingSpinner, EuiFlexItem } from '@elastic/eui';
import { IEmbeddable } from '../../../../src/plugins/embeddable/public';

interface Props {
  embeddable: IEmbeddable;
}

export class EmbeddableListItem extends React.Component<Props> {
  private embeddableRoot: React.RefObject<HTMLDivElement>;
  private rendered = false;

  constructor(props: Props) {
    super(props);
    this.embeddableRoot = React.createRef();
  }

  public componentDidMount() {
    if (this.embeddableRoot.current && this.props.embeddable) {
      this.props.embeddable.render(this.embeddableRoot.current);
      this.rendered = true;
    }
  }

  public componentDidUpdate() {
    if (this.embeddableRoot.current && this.props.embeddable && !this.rendered) {
      this.props.embeddable.render(this.embeddableRoot.current);
      this.rendered = true;
    }
  }

  public componentWillUnmount() {
    if (this.props.embeddable) {
      this.props.embeddable.destroy();
    }
  }

  public render() {
    return (
      <EuiFlexItem>
        <EuiPanel>
          {this.props.embeddable ? (
            <div ref={this.embeddableRoot} />
          ) : (
            <EuiLoadingSpinner size="s" />
          )}
        </EuiPanel>
      </EuiFlexItem>
    );
  }
}
