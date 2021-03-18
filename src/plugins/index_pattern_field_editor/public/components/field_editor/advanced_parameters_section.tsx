/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

interface Props {
  children: React.ReactNode;
}

export const AdvancedParametersSection = ({ children }: Props) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const toggleIsVisible = () => {
    setIsVisible(!isVisible);
  };

  return (
    <>
      <EuiButtonEmpty onClick={toggleIsVisible} flush="left" data-test-subj="toggleAdvancedSetting">
        {isVisible
          ? i18n.translate('indexPatternFieldEditor.editor.form.advancedSettings.hideButtonLabel', {
              defaultMessage: 'Hide advanced settings',
            })
          : i18n.translate('indexPatternFieldEditor.editor.form.advancedSettings.showButtonLabel', {
              defaultMessage: 'Show advanced settings',
            })}
      </EuiButtonEmpty>

      <div style={{ display: isVisible ? 'block' : 'none' }} data-test-subj="advancedSettings">
        <EuiSpacer size="m" />
        {/* We ned to wrap the children inside a "div" to have our css :first-child rule */}
        <div>{children}</div>
      </div>
    </>
  );
};
