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

import React, { Component } from 'react';

import { EuiButton, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { Embeddable } from '../../../../';
import { CustomizeTitleForm } from './customize_title_form';

interface CustomizePanelProps {
  embeddable: Embeddable;
  updateTitle: (newTitle: string | undefined) => void;
}

interface State {
  title: string | undefined;
}

export class CustomizePanelFlyout extends Component<CustomizePanelProps, State> {
  constructor(props: CustomizePanelProps) {
    super(props);
    this.state = {
      title: props.embeddable.getTitle(),
    };
  }

  updateTitle = (title: string | undefined) => {
    this.setState({ title });
  };

  reset = () => {
    this.props.updateTitle(undefined);
  };

  public render() {
    return (
      <React.Fragment>
        <EuiFlyoutHeader>
          <EuiTitle size="s" data-test-subj="customizePanelTitle">
            <h1>{this.props.embeddable.getTitle()}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <CustomizeTitleForm
            title={this.state.title || this.props.embeddable.getTitle()}
            onReset={this.reset}
            onUpdatePanelTitle={this.updateTitle}
          />
          <EuiButton onClick={() => this.props.updateTitle(this.state.title)}>
            Save & Close
          </EuiButton>
        </EuiFlyoutBody>
      </React.Fragment>
    );
  }
}
