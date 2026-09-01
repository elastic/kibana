/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';

import type { Warnings } from '../../../server/api/types';
import { coreServices } from '../../services/kibana_services';

export const showWarningToast = ({ warnings }: { warnings: Warnings }) => {
  let droppedPanelsCount = 0;
  warnings.forEach((warning) => {
    if (warning.type === 'dropped_panel') {
      droppedPanelsCount++;
    }
  });

  let warningNotificationTitle;
  if (droppedPanelsCount === warnings.length) {
    warningNotificationTitle = i18n.translate('dashboard.warnings.modal.droppedPanelsWarning', {
      defaultMessage:
        '{droppedPanelsCount} {droppedPanelsCount, plural, one {panel has} other {panels have}} been removed from the dashboard.',
      values: { droppedPanelsCount },
    });
  } else {
    warningNotificationTitle = i18n.translate('dashboard.warnings.modal.genericWarning', {
      defaultMessage:
        'This dashboard has {warningCount} {warningCount, plural, one {warning} other {warnings}}.',
      values: { warningCount: warnings.length },
    });
  }

  const openModal = () => {
    const modal = coreServices.overlays.openModal(
      toMountPoint(
        <EuiModal aria-labelledby={'modalTitleId'} onClose={() => modal.close()}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={'modalTitleId'}>
              {i18n.translate('dashboard.warnings.modal.title', {
                defaultMessage: 'Warning details',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
              {JSON.stringify(warnings, null, 2)}
            </EuiCodeBlock>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => modal.close()}>
              {i18n.translate('dashboard.warnings.modal.closeButtonText', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>,
        coreServices.rendering
      )
    );
  };

  coreServices.notifications.toasts.addWarning({
    title: warningNotificationTitle,
    text: toMountPoint(
      <>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton color="warning" size="s" onClick={openModal}>
              {i18n.translate('dashboard.warningToast.button', {
                defaultMessage: 'Learn more',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>,
      coreServices.rendering
    ),
  });
};
