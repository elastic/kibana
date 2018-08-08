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
  KuiModal,
  KuiModalBody,
  KuiModalFooter,
  KuiModalHeader,
  KuiModalHeaderTitle,
  KuiModalOverlay,
} from '../../../../components';

export class ModalExample extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isModalVisible: false,
    };
  }

  closeModal = () => {
    this.setState({ isModalVisible: false });
  };

  showModal = () => {
    this.setState({ isModalVisible: true });
  };

  render() {
    let modal;

    if (this.state.isModalVisible) {
      modal = (
        <KuiModalOverlay>
          <KuiModal
            onClose={this.closeModal}
            style={{ width: '800px' }}
          >
            <KuiModalHeader>
              <KuiModalHeaderTitle >
                Modal
              </KuiModalHeaderTitle>
            </KuiModalHeader>

            <KuiModalBody>
              <p className="kuiText">
                You can put anything you want in here!
              </p>
            </KuiModalBody>

            <KuiModalFooter>
              <KuiButton
                buttonType="hollow"
                onClick={this.closeModal}
              >
                Cancel
              </KuiButton>

              <KuiButton
                buttonType="primary"
                onClick={this.closeModal}
              >
                Save
              </KuiButton>
            </KuiModalFooter>
          </KuiModal>
        </KuiModalOverlay>
      );
    }
    return (
      <div>
        <KuiButton onClick={this.showModal}>
          Show Modal
        </KuiButton>

        {modal}
      </div>
    );
  }
}
