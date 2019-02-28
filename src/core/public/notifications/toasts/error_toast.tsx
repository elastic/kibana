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
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useState } from 'react';

interface ErrorToastProps {
  title: string;
  error: Error;
  toastMessage: string;
}

export function ErrorToast({ title, error, toastMessage }: ErrorToastProps) {
  const [isModalVisible, setModalVisible] = useState(false);

  return (
    <React.Fragment>
      <p data-test-subj="errorToastMessage">{toastMessage}</p>
      <div className="eui-textRight">
        <EuiButton size="s" color="danger" onClick={() => setModalVisible(true)}>
          <FormattedMessage
            id="core.toasts.errorToast.seeFullError"
            defaultMessage="See the full error"
          />
        </EuiButton>
      </div>

      {isModalVisible && (
        <EuiOverlayMask>
          <EuiModal onClose={() => setModalVisible(false)} data-test-subj="fullErrorModal">
            <EuiModalHeader>
              <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody>
              <EuiCallOut size="s" color="danger" iconType="alert" title={error.message} />
              {error.stack && (
                <React.Fragment>
                  <EuiSpacer size="s" />
                  <EuiCodeBlock isCopyable={true} paddingSize="s">
                    {error.stack}
                  </EuiCodeBlock>
                </React.Fragment>
              )}
            </EuiModalBody>
            <EuiModalFooter>
              <EuiButton onClick={() => setModalVisible(false)} fill>
                <FormattedMessage id="core.toasts.errorToast.closeModal" defaultMessage="Close" />
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </React.Fragment>
  );
}
