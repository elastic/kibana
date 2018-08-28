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

import React, {
  Component,
} from 'react';

import {
  KuiButton,
  KuiConfirmModal,
  KuiModalOverlay,
  KUI_MODAL_CONFIRM_BUTTON,
} from '../../../../components';

export class ConfirmModalExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };

    this.closeModal = this.closeModal.bind(this);
    this.showModal = this.showModal.bind(this);
  }

  closeModal() {
    this.setState({ isModalVisible: false });
  }

  showModal() {
    this.setState({ isModalVisible: true });
  }

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <KuiModalOverlay>
          <KuiConfirmModal
            title="Do this thing"
            onCancel={this.closeModal}
            onConfirm={this.closeModal}
            cancelButtonText="No, don't do it"
            confirmButtonText="Yes, do it"
            defaultFocusedButton={KUI_MODAL_CONFIRM_BUTTON}
          >
            <p className="kuiText">You&rsquo;re about to do something.</p>
            <p className="kuiText">Are you sure you want to do this?</p>
          </KuiConfirmModal>
        </KuiModalOverlay>
      );
    }

    return (
      <div>
        <KuiButton onClick={this.showModal}>
          Show ConfirmModal
        </KuiButton>

        {modal}
      </div>
    );
  }
}
