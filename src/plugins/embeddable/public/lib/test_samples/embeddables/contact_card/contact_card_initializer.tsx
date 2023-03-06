/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  onCreate: (name: { lastName?: string; firstName: string }) => void;
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
                data-test-subj="pluginsFieldText"
                name="popfirst"
                value={this.state.firstName}
                onChange={(e) => this.setState({ firstName: e.target.value })}
              />
            </EuiFormRow>

            <EuiFormRow label="Last name">
              <EuiFieldText
                data-test-subj="pluginsFieldText"
                name="popfirst"
                value={this.state.lastName}
                placeholder="optional"
                onChange={(e) => this.setState({ lastName: e.target.value })}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="pluginsCancelButtonEmpty" onClick={this.props.onCancel}>
            Cancel
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="pluginsCreateButton"
            isDisabled={!this.state.firstName}
            onClick={() => {
              if (this.state.firstName) {
                this.props.onCreate({
                  firstName: this.state.firstName,
                  ...(this.state.lastName ? { lastName: this.state.lastName } : {}),
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
