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
import PropTypes from 'prop-types';
import classnames from 'classnames';

import { KuiModal } from './modal';
import { KuiModalFooter } from './modal_footer';
import { KuiModalHeader } from './modal_header';
import { KuiModalHeaderTitle } from './modal_header_title';
import { KuiModalBody } from './modal_body';
import {
  KuiButton,
} from '../../components/';

export const CONFIRM_BUTTON = 'confirm';
export const CANCEL_BUTTON = 'cancel';

const CONFIRM_MODAL_BUTTONS = [
  CONFIRM_BUTTON,
  CANCEL_BUTTON,
];

export function KuiConfirmModal({
  children,
  title,
  onCancel,
  onConfirm,
  cancelButtonText,
  confirmButtonText,
  className,
  defaultFocusedButton,
  ...rest
}) {
  const classes = classnames('kuiModal--confirmation', className);

  let modalTitle;

  if (title) {
    modalTitle = (
      <KuiModalHeader>
        <KuiModalHeaderTitle data-test-subj="confirmModalTitleText">
          {title}
        </KuiModalHeaderTitle>
      </KuiModalHeader>
    );
  }

  let message;

  if (typeof children === 'string') {
    message = <p className="kuiText">{children}</p>;
  } else {
    message = children;
  }

  return (
    <KuiModal
      className={classes}
      onClose={onCancel}
      {...rest}
    >
      {modalTitle}

      <KuiModalBody>
        <div data-test-subj="confirmModalBodyText">
          {message}
        </div>
      </KuiModalBody>

      <KuiModalFooter>
        <KuiButton
          buttonType="hollow"
          autoFocus={defaultFocusedButton === CANCEL_BUTTON}
          data-test-subj="confirmModalCancelButton"
          onClick={onCancel}
        >
          {cancelButtonText}
        </KuiButton>

        <KuiButton
          buttonType="primary"
          autoFocus={defaultFocusedButton === CONFIRM_BUTTON}
          data-test-subj="confirmModalConfirmButton"
          onClick={onConfirm}
        >
          {confirmButtonText}
        </KuiButton>
      </KuiModalFooter>
    </KuiModal>
  );
}

KuiConfirmModal.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  cancelButtonText: PropTypes.string,
  confirmButtonText: PropTypes.string,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func,
  className: PropTypes.string,
  defaultFocusedButton: PropTypes.oneOf(CONFIRM_MODAL_BUTTONS)
};
