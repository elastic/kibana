/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiFieldText,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';

const PanelIdModal = ({
  suggestion,
  onClose,
  onSubmit,
}: {
  suggestion: string;
  onClose: () => void;
  onSubmit: (id: string) => void;
}) => {
  const [panelId, setPanelId] = useState<string>(suggestion);

  return (
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('examples.gridExample.getPanelIdModalTitle', {
            defaultMessage: 'Panel ID',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          color="warning"
          title={i18n.translate('examples.gridExample.getPanelIdWarning', {
            defaultMessage: 'Ensure the panel ID is unique, or you may get unexpected behaviour.',
          })}
        />

        <EuiSpacer size="m" />

        <EuiFieldText
          placeholder={suggestion}
          value={panelId}
          onChange={(e) => {
            setPanelId(e.target.value ?? '');
          }}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          onClick={() => {
            onSubmit(panelId);
          }}
        >
          {i18n.translate('examples.gridExample.getPanelIdSubmitButton', {
            defaultMessage: 'Submit',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export const getPanelId = async ({
  coreStart,
  suggestion,
}: {
  coreStart: CoreStart;
  suggestion: string;
}): Promise<string | undefined> => {
  return new Promise<string | undefined>((resolve) => {
    const session = coreStart.overlays.openModal(
      toMountPoint(
        <PanelIdModal
          suggestion={suggestion}
          onClose={() => {
            resolve(undefined);
            session.close();
          }}
          onSubmit={(newPanelId) => {
            resolve(newPanelId);
            session.close();
          }}
        />,
        {
          theme: coreStart.theme,
          i18n: coreStart.i18n,
        }
      )
    );
  });
};
