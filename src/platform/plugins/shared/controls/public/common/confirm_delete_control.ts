/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { coreServices } from '../services/kibana_services';

const openConfirmDeleteModal = (all: boolean) =>
  coreServices.overlays.openConfirm(
    i18n.translate('controls.controlGroup.management.delete.sub', {
      defaultMessage: 'Controls are not recoverable once removed.',
    }),
    {
      confirmButtonText: i18n.translate('controls.controlGroup.management.delete.confirm', {
        defaultMessage: 'Delete',
      }),
      cancelButtonText: i18n.translate('controls.controlGroup.management.delete.cancel', {
        defaultMessage: 'Cancel',
      }),
      title: all
        ? i18n.translate('controls.controlGroup.management.delete.deleteAllTitle', {
            defaultMessage: 'Delete all controls?',
          })
        : i18n.translate('controls.controlGroup.management.delete.deleteTitle', {
            defaultMessage: 'Delete control?',
          }),
      buttonColor: 'danger',
    }
  );

export const confirmDeleteControl = () => openConfirmDeleteModal(false);
export const confirmDeleteAllControls = () => openConfirmDeleteModal(true);
