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
  let generalWarningCount = 0;
  warnings.forEach((warning) => {
    if (warning.type === 'dropped_panel') {
      droppedPanelsCount++;
    } else {
      generalWarningCount++;
    }
  });

  let warningMessage;
  if (droppedPanelsCount > 0 && !generalWarningCount) {
    warningMessage = i18n.translate('dashboard.droppedPanelsWarning', {
      defaultMessage:
        '{droppedPanelsCount} {droppedPanelsCount, plural, one {panel has} other {panels have}} been removed from the dashboard.',
      values: { droppedPanelsCount },
    });
  } else if (generalWarningCount > 0 && !droppedPanelsCount) {
    warningMessage = i18n.translate('dashboard.schemaWarning', {
      defaultMessage:
        'There {warningCount, plural, one {is} other {are}} {warningCount} {warningCount, plural, one {warning} other {warnings}} on this dashboard that could not be automatically resolved.',
      values: { warningCount: warnings.length },
    });
  } else {
    warningMessage = i18n.translate('dashboard.multipleWarnings', {
      defaultMessage:
        '{droppedPanelsCount} {droppedPanelsCount, plural, one {panel has} other {panels have}} been removed, and there {warningCount, plural, one {is} other {are}} {warningCount} other {warningCount, plural, one {warning} other {warnings}} that could not be automatically resolved.',
      values: { droppedPanelsCount, warningCount: warnings.length - droppedPanelsCount },
    });
  }

  const openModal = () => {
    const modal = coreServices.overlays.openModal(
      toMountPoint(
        <EuiModal aria-labelledby={'modalTitleId'} onClose={() => modal.close()}>
          <EuiModalHeader>
            <EuiModalHeaderTitle id={'modalTitleId'}>
              {i18n.translate('dashboard.warnings.modalTitle', {
                defaultMessage: 'Dashboard warnings',
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
              {i18n.translate('xpack.transform.toastText.closeModalButtonText', {
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
    title: i18n.translate('dashboard.schemaWarning', {
      defaultMessage:
        'This dashboard has {warningCount} {warningCount, plural, one {warning} other {warnings}}.',
      values: { warningCount: warnings.length },
    }),
    text: toMountPoint(
      <>
        <p>{warningMessage}</p>
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
