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

import angular from 'angular';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import { uiModules } from '../modules';
import template from './confirm_modal.html';
import { ModalOverlay } from './modal_overlay';

const module = uiModules.get('kibana');

import {
  EUI_MODAL_CONFIRM_BUTTON as CONFIRM_BUTTON,
  EUI_MODAL_CANCEL_BUTTON as CANCEL_BUTTON,
} from '@elastic/eui';

export const ConfirmationButtonTypes = {
  CONFIRM: CONFIRM_BUTTON,
  CANCEL: CANCEL_BUTTON,
};

/**
 * @typedef {Object} ConfirmModalOptions
 * @property {String} confirmButtonText
 * @property {String=} cancelButtonText
 * @property {function} onConfirm
 * @property {function=} onCancel
 * @property {String=} title - If given, shows a title on the confirm modal.
 */

module.factory('confirmModal', function($rootScope, $compile) {
  let modalPopover;
  const confirmQueue = [];

  /**
   * @param {String} message - the message to show in the body of the confirmation dialog.
   * @param {ConfirmModalOptions} - Options to further customize the dialog.
   */
  return function confirmModal(message, customOptions) {
    const defaultOptions = {
      onCancel: noop,
      cancelButtonText: i18n.translate('common.ui.modals.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      }),
      defaultFocusedButton: ConfirmationButtonTypes.CONFIRM,
    };

    if (!customOptions.confirmButtonText || !customOptions.onConfirm) {
      throw new Error('Please specify confirmation button text and onConfirm action');
    }

    const options = Object.assign(defaultOptions, customOptions);

    // Special handling for onClose - if no specific callback was supplied, default to the
    // onCancel callback.
    options.onClose = customOptions.onClose || options.onCancel;

    const confirmScope = $rootScope.$new();

    confirmScope.message = message;
    confirmScope.defaultFocusedButton = options.defaultFocusedButton;
    confirmScope.confirmButtonText = options.confirmButtonText;
    confirmScope.cancelButtonText = options.cancelButtonText;
    confirmScope.title = options.title;
    confirmScope.onConfirm = () => {
      destroy();
      options.onConfirm();
    };
    confirmScope.onCancel = () => {
      destroy();
      options.onCancel();
    };
    confirmScope.onClose = () => {
      destroy();
      options.onClose();
    };

    function showModal(confirmScope) {
      const modalInstance = $compile(template)(confirmScope);
      modalPopover = new ModalOverlay(modalInstance);
    }

    if (modalPopover) {
      confirmQueue.unshift(confirmScope);
    } else {
      showModal(confirmScope);
    }

    function destroy() {
      modalPopover.destroy();
      modalPopover = undefined;
      angular.element(document.body).off('keydown');
      confirmScope.$destroy();

      if (confirmQueue.length > 0) {
        showModal(confirmQueue.pop());
      }
    }
  };
});
