/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { getLanguageDisplayName } from '@kbn/es-query';
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
} from '@elastic/eui';

export interface TextBasedLanguagesTransitionModalProps {
  closeModal: (dismissFlag: boolean, needsSave?: boolean) => void;
  setIsTextLangTransitionModalVisible: (flag: boolean) => void;
  textBasedLanguage?: string;
}
// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export default function TextBasedLanguagesTransitionModal({
  closeModal,
  setIsTextLangTransitionModalVisible,
  textBasedLanguage,
}: TextBasedLanguagesTransitionModalProps) {
  const [dismissModalChecked, setDismissModalChecked] = useState(false);
  const onTransitionModalDismiss = useCallback((e) => {
    setDismissModalChecked(e.target.checked);
  }, []);

  const language = getLanguageDisplayName(textBasedLanguage);
  return (
    <EuiModal
      onClose={() => setIsTextLangTransitionModalVisible(false)}
      style={{ width: 700 }}
      data-test-subj="unifiedSearch_switch_modal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalTitle',
            {
              defaultMessage: 'Your query will be removed',
            }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="m">
          {i18n.translate(
            'unifiedSearch.query.queryBar.indexPattern.textBasedLanguagesTransitionModalBody',
            {
              defaultMessage:
                "Switching data views removes the current {language} query. Save this search to ensure you don't lose work.",
              values: { language },
            }
          )}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
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
            <EuiFlexGroup gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => closeModal(dismissModalChecked)}
                  color="warning"
                  iconType="merge"
                  data-test-subj="unifiedSearch_switch_noSave"
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
                  data-test-subj="unifiedSearch_switch_andSave"
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
