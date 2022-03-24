/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent } from 'react';

import { EuiButtonEmpty, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface PanelOptionsMenuFormProps {
  title?: string;
  onReset: () => void;
  onUpdatePanelTitle: (newPanelTitle: string) => void;
}

export function CustomizeTitleForm({
  title,
  onReset,
  onUpdatePanelTitle,
}: PanelOptionsMenuFormProps) {
  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    onUpdatePanelTitle(event.target.value);
  }

  return (
    <div className="embPanel__optionsMenuForm" data-test-subj="dashboardPanelTitleInputMenuItem">
      <EuiFormRow
        label={i18n.translate(
          'embeddableApi.customizeTitle.optionsMenuForm.panelTitleFormRowLabel',
          {
            defaultMessage: 'Panel title',
          }
        )}
      >
        <EuiFieldText
          id="panelTitleInput"
          data-test-subj="customEmbeddablePanelTitleInput"
          name="min"
          type="text"
          value={title}
          onChange={onInputChange}
          aria-label={i18n.translate(
            'embeddableApi.customizeTitle.optionsMenuForm.panelTitleInputAriaLabel',
            {
              defaultMessage: 'Changes to this input are applied immediately. Press enter to exit.',
            }
          )}
        />
      </EuiFormRow>

      <EuiButtonEmpty data-test-subj="resetCustomEmbeddablePanelTitle" onClick={onReset}>
        <FormattedMessage
          id="embeddableApi.customizeTitle.optionsMenuForm.resetCustomDashboardButtonLabel"
          defaultMessage="Reset title"
        />
      </EuiButtonEmpty>
    </div>
  );
}
