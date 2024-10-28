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
  EuiFieldText,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';

const PanelIdModal = ({
  suggestion,
  onSubmit,
}: {
  suggestion: string;
  onSubmit: (id: string) => void;
}) => {
  const [panelId, setPanelId] = useState<string>(suggestion);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Panel ID</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
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
          Submit
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

export const getPanelId = async ({
  coreStart,
  suggestion,
}: {
  coreStart: CoreStart;
  suggestion: string;
}): Promise<string> => {
  return new Promise<string>((resolve) => {
    const session = coreStart.overlays.openModal(
      toMountPoint(
        <PanelIdModal
          suggestion={suggestion}
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
