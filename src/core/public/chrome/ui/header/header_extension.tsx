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
import { MountPoint } from '../../../types';

interface Props {
  extension?: MountPoint<HTMLDivElement>;
}

export class HeaderExtension extends React.Component<Props> {
  private readonly ref = React.createRef<HTMLDivElement>();
  private unrender?: () => void;

  public componentDidMount() {
    this.renderExtension();
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.extension === prevProps.extension) {
      return;
    }

    this.unrenderExtension();
    this.renderExtension();
  }

  public componentWillUnmount() {
    this.unrenderExtension();
  }

  public render() {
    return <div ref={this.ref} />;
  }

  private renderExtension() {
    if (!this.ref.current) {
      throw new Error('<HeaderExtension /> mounted without ref');
    }

    if (this.props.extension) {
      this.unrender = this.props.extension(this.ref.current);
    }
  }

  private unrenderExtension() {
    if (this.unrender) {
      this.unrender();
      this.unrender = undefined;
    }
  }
}
