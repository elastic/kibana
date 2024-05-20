/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCard, EuiFlexItem, EuiFlexGroup, EuiFormRow } from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiButton } from '@elastic/eui';
import * as Rx from 'rxjs';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ContactCardEmbeddable, CONTACT_USER_TRIGGER } from './contact_card_embeddable';

interface Props {
  embeddable: ContactCardEmbeddable;
  execTrigger: UiActionsStart['executeTriggerActions'];
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
