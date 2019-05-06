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

import React, { Component, RefObject } from 'react';
import { EuiLoadingChart } from '@elastic/eui';
import { Embeddable } from './embeddable';

interface Props {
  embeddable?: Embeddable;
  withPanel: boolean;
  style?: object;
}

export class EmbeddableWrapper extends Component<Props> {
  private root: RefObject<HTMLDivElement>;
  private embeddableRendered = false;

  constructor(props: Props) {
    super(props);
    this.root = React.createRef();
  }

  componentDidMount() {
    this.mountEmbbeddable();
  }

  componentDidUpdate() {
    this.mountEmbbeddable();
  }

  componentWillUnmount() {
    if (this.props.embeddable) {
      this.props.embeddable.destroy();
    }
  }

  mountEmbbeddable() {
    if (this.root.current && this.props.embeddable && !this.embeddableRendered) {
      if (this.props.withPanel) {
        this.props.embeddable.renderInPanel(this.root.current);
      } else if (this.root.current) {
        this.props.embeddable.render(this.root.current);
      }
      this.embeddableRendered = true;
    }
  }

  render() {
    if (this.props.embeddable) {
      const { withPanel, embeddable, ...otherProps } = this.props;
      return <div {...otherProps} ref={this.root} />;
    } else {
      return <EuiLoadingChart />;
    }
  }
}
