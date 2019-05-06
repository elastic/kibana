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
import { EuiAvatar } from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiText, EuiButton } from '@elastic/eui';
import { executeTriggerActions } from 'plugins/embeddable_api/triggers';
import { getNewPlatform } from 'ui/new_platform';
import { GreetingEmbeddable, CONTACT_USER_TRIGGER } from './greeting_embeddable';
import { GetMessageModal } from './get_message_modal';

interface Props {
  embeddable: GreetingEmbeddable;
}

interface State {
  fullName: string;
}

export class GreetingEmbeddableComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      fullName: this.props.embeddable.getOutput().fullName,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.embeddable.getOutput$().subscribe(() => {
      if (this.mounted) {
        this.setState({ fullName: this.props.embeddable.getOutput().fullName });
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
    const modal = getNewPlatform().start.core.overlays.openModal(
      <GetMessageModal
        onCancel={() => modal.close()}
        onDone={message => {
          modal.close();
          executeTriggerActions(CONTACT_USER_TRIGGER, {
            embeddable: this.props.embeddable,
            triggerContext: { message },
          });
        }}
      />
    );
  };

  render() {
    return (
      <div data-test-subj="helloWorldEmbeddable">
        <EuiAvatar size="s" name={this.state.fullName} />
        <EuiText>Hello {this.state.fullName}!</EuiText>
        <EuiButton onClick={this.emitContactTrigger}>Contact</EuiButton>
      </div>
    );
  }
}
