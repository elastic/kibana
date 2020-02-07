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

import { KuiButton, KuiPagerButtonGroup } from '../../../../components';

export class PagerButtons extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      item: 1,
      maxItems: 3,
    };
  }

  getPage() {
    switch (this.state.item) {
      case 1:
        return <div>I&rsquo;m Page 1!</div>;
      case 2:
        return <KuiButton>I&rsquo;m a button</KuiButton>;
      case 3:
        return <div>You are at the end</div>;
    }
  }

  hasNext = () => this.state.item < this.state.maxItems;
  hasPrevious = () => this.state.item > 1;
  onNext = () => this.setState({ item: this.state.item + 1 });
  onPrevious = () => this.setState({ item: this.state.item - 1 });

  render() {
    return (
      <div>
        <KuiPagerButtonGroup
          hasNext={this.hasNext()}
          hasPrevious={this.hasPrevious()}
          onNext={this.onNext}
          onPrevious={this.onPrevious}
        />
        {this.getPage()}
      </div>
    );
  }
}
