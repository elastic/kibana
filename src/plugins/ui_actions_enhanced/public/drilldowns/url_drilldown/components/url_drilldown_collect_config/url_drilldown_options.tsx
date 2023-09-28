/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch, EuiTextColor } from '@elastic/eui';

import {
  txtUrlTemplateEncodeDescription,
  txtUrlTemplateEncodeUrl,
  txtUrlTemplateOpenInNewTab,
} from './i18n';
import { UrlDrilldownOptions } from '../../types';

export interface UrlDrilldownOptionsProps {
  options: UrlDrilldownOptions;
  onOptionChange: (newOptions: Partial<UrlDrilldownOptions>) => void;
}

export const UrlDrilldownOptionsComponent = ({
  options,
  onOptionChange,
}: UrlDrilldownOptionsProps) => {
  return (
    <>
      <EuiFormRow hasChildLabel={false}>
        <EuiSwitch
          id="openInNewTab"
          name="openInNewTab"
          label={txtUrlTemplateOpenInNewTab}
          checked={options.openInNewTab}
          onChange={() => onOptionChange({ openInNewTab: !options.openInNewTab })}
          data-test-subj="urlDrilldownOpenInNewTab"
        />
      </EuiFormRow>
      <EuiFormRow hasChildLabel={false} fullWidth>
        <EuiSwitch
          id="encodeUrl"
          name="encodeUrl"
          label={
            <>
              {txtUrlTemplateEncodeUrl}
              <EuiSpacer size={'s'} />
              <EuiTextColor color="subdued">{txtUrlTemplateEncodeDescription}</EuiTextColor>
            </>
          }
          checked={options.encodeUrl}
          onChange={() => onOptionChange({ encodeUrl: !options.encodeUrl })}
          data-test-subj="urlDrilldownEncodeUrl"
        />
      </EuiFormRow>
    </>
  );
};
