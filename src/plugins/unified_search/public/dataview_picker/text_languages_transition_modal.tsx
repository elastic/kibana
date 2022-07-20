/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import {
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiButton,
  EuiText,
  EuiCheckbox,
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';

export interface TextBasedLanguagesTransitionModalProps {
  closeModal: (dismissFlag: boolean, needsSave?: boolean) => void;
}
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function TextBasedLanguagesTransitionModal({
  closeModal,
}: TextBasedLanguagesTransitionModalProps) {
  const [dismissModalChecked, setDismissModalChecked] = useState(false);
  const onTransitionModalDismiss = useCallback((e) => {
    setDismissModalChecked(e.target.checked);
  }, []);

  const { euiTheme } = useEuiTheme();
  return (
    <EuiModal onClose={() => closeModal(dismissModalChecked)} style={{ width: 700 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>
            {i18n.translate(
              'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalTitle',
              {
                defaultMessage: 'Current text-based query will be cleared',
              }
            )}
          </h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          {i18n.translate(
            'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalBody',
            {
              defaultMessage:
                'The current text-based language query will be cleared when switching to a specific data view. To ensure that no work is inadvertently lost in the transition, it is recommended that you save this search before switching.',
            }
          )}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter
        css={css`
          justify-content: space-between;
        `}
      >
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiCheckbox
              id="dismiss-text-based-languages-transition-modal"
              label={i18n.translate(
                'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalDismissButton',
                {
                  defaultMessage: "Don't show this warning again",
                }
              )}
              checked={dismissModalChecked}
              onChange={onTransitionModalDismiss}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => closeModal(dismissModalChecked)}
                  color="warning"
                  iconType="merge"
                  css={css`
                    color: ${euiTheme.colors.warning};
                    border: 1px solid ${euiTheme.colors.warning};
                    background-color: ${euiTheme.colors.emptyShade};
                  `}
                >
                  {i18n.translate(
                    'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalCloseButton',
                    {
                      defaultMessage: 'Switch without saving',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => closeModal(dismissModalChecked, true)}
                  fill
                  color="success"
                  iconType="save"
                >
                  {i18n.translate(
                    'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalSaveButton',
                    {
                      defaultMessage: 'Save and switch',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
