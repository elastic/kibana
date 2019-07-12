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

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiButton,
  EuiModalFooter,
  EuiButtonEmpty,
} from '@elastic/eui';
import React, { Component } from 'react';

export interface ContactCardInitializerProps {
  onCreate: (name: { lastName: string; firstName: string }) => void;
  onCancel: () => void;
}

interface State {
  firstName?: string;
  lastName?: string;
}

export class ContactCardInitializer extends Component<ContactCardInitializerProps, State> {
  constructor(props: ContactCardInitializerProps) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Create a new greeting card</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiForm>
            <EuiFormRow label="First name">
              <EuiFieldText
                name="popfirst"
                value={this.state.firstName}
                onChange={e => this.setState({ firstName: e.target.value })}
              />
            </EuiFormRow>

            <EuiFormRow label="Last name">
              <EuiFieldText
                name="popfirst"
                value={this.state.lastName}
                onChange={e => this.setState({ lastName: e.target.value })}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={this.props.onCancel}>Cancel</EuiButtonEmpty>

          <EuiButton
            isDisabled={!this.state.lastName || !this.state.firstName}
            onClick={() => {
              if (this.state.lastName && this.state.firstName) {
                this.props.onCreate({
                  firstName: this.state.firstName,
                  lastName: this.state.lastName,
                });
              }
            }}
            fill
          >
            Create
          </EuiButton>
        </EuiModalFooter>
      </div>
    );
  }
}
