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
import { EuiCard, EuiFlexItem, EuiFlexGroup, EuiFormRow } from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiButton } from '@elastic/eui';
import * as Rx from 'rxjs';
import { TExecuteTriggerActions } from 'src/plugins/ui_actions/public';
import { ContactCardEmbeddable, CONTACT_USER_TRIGGER } from './contact_card_embeddable';

interface Props {
  embeddable: ContactCardEmbeddable;
  execTrigger: TExecuteTriggerActions;
}

interface State {
  fullName: string;
  firstName: string;
}

export class ContactCardEmbeddableComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      fullName: this.props.embeddable.getOutput().fullName,
      firstName: this.props.embeddable.getInput().firstName,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted) {
        this.setState({
          fullName: this.props.embeddable.getOutput().fullName,
          firstName: this.props.embeddable.getInput().firstName,
        });
      }
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.mounted = false;
  }

  emitContactTrigger = () => {
    this.props.execTrigger(CONTACT_USER_TRIGGER, {
      embeddable: this.props.embeddable,
      triggerContext: {},
    });
  };

  getCardFooterContent = () => (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiFormRow label="">
          <EuiButton
            onClick={this.emitContactTrigger}
          >{`Contact ${this.state.firstName}`}</EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  render() {
    return (
      <EuiCard
        textAlign="left"
        title={this.state.fullName}
        footer={this.getCardFooterContent()}
        description=""
      />
    );
  }
}
