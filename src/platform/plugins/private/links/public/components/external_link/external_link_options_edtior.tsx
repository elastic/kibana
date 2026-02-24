/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFormRow, EuiSpacer, EuiSwitch, EuiTextColor } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { ExternalLinkOptions } from '../../../server';
import { DEFAULT_EXTERNAL_LINK_OPTIONS } from './constants';

interface Props {
  options: ExternalLinkOptions;
  onOptionChange: (newOptions: ExternalLinkOptions) => void;
}

export const ExternalLinkOptionsEditor = ({ options, onOptionChange }: Props) => {
  return (
    <EuiFormRow>
      <div>
        <EuiSwitch
          compressed
          id="openInNewTab"
          name="openInNewTab"
          label={i18n.translate('links.externalUrl.openInNewTabLabel', {
            defaultMessage: 'Open URL in new tab',
          })}
          checked={options.openInNewTab ?? DEFAULT_EXTERNAL_LINK_OPTIONS.openInNewTab}
          onChange={() => onOptionChange({ openInNewTab: !options.openInNewTab })}
          data-test-subj="urlDrilldownOpenInNewTab"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          id="encodeUrl"
          name="encodeUrl"
          label={
            <>
              {i18n.translate('links.externalUrl.encodeUrl', {
                defaultMessage: 'Encode URL',
              })}
              <EuiSpacer size={'s'} />
              <EuiTextColor color="subdued">
                {i18n.translate('links.externalUrl.encodeDescription', {
                  defaultMessage: 'If enabled, URL will be escaped using percent encoding',
                })}
              </EuiTextColor>
            </>
          }
          checked={options.encodeUrl ?? DEFAULT_EXTERNAL_LINK_OPTIONS.encodeUrl}
          onChange={() => onOptionChange({ encodeUrl: !options.encodeUrl })}
          data-test-subj="urlDrilldownEncodeUrl"
        />
      </div>
    </EuiFormRow>
  );
};
