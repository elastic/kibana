/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

interface Props {
  onDone: (message: string) => void;
  onCancel: () => void;
}

interface State {
  message?: string;
}

export class GetMessageModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>Enter your message</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiForm>
            <EuiFormRow label="Message">
              <EuiFieldText
                name="popfirst"
                value={this.state.message}
                onChange={(e) => this.setState({ message: e.target.value })}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={this.props.onCancel}>Cancel</EuiButtonEmpty>

          <EuiButton
            isDisabled={!this.state.message}
            onClick={() => {
              if (this.state.message) {
                this.props.onDone(this.state.message);
              }
            }}
            fill
          >
            Done
          </EuiButton>
        </EuiModalFooter>
      </React.Fragment>
    );
  }
}
