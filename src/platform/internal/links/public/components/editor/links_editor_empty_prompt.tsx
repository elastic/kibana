/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiText, EuiPanel, EuiSpacer, EuiButton, EuiEmptyPrompt, EuiFormRow } from '@elastic/eui';

import { LinksStrings } from '../links_strings';

export const LinksEditorEmptyPrompt = ({ addLink }: { addLink: () => Promise<void> }) => {
  return (
    <EuiFormRow data-test-subj="links--panelEditor--emptyPrompt">
      <EuiPanel paddingSize="m" hasBorder={true}>
        <EuiEmptyPrompt
          color="plain"
          hasShadow={false}
          paddingSize="none"
          body={
            <>
              <EuiText size="s">{LinksStrings.editor.panelEditor.getEmptyLinksMessage()}</EuiText>
              <EuiSpacer size="m" />
              <EuiButton
                size="s"
                onClick={addLink}
                iconType="plusInCircle"
                data-test-subj="links--panelEditor--addLinkBtn"
              >
                {LinksStrings.editor.getAddButtonLabel()}
              </EuiButton>
            </>
          }
        />
      </EuiPanel>
    </EuiFormRow>
  );
};
