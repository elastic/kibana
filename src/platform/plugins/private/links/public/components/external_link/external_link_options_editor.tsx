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
import { DEFAULT_EXTERNAL_LINK_OPTIONS } from '../../../common/constants';

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
          name="open_in_new_tab"
          label={i18n.translate('links.externalUrl.openInNewTabLabel', {
            defaultMessage: 'Open URL in new tab',
          })}
          checked={options.open_in_new_tab ?? DEFAULT_EXTERNAL_LINK_OPTIONS.open_in_new_tab}
          onChange={() => onOptionChange({ ...options, open_in_new_tab: !options.open_in_new_tab })}
          data-test-subj="urlDrilldownOpenInNewTab"
        />
        <EuiSpacer size="s" />
        <EuiSwitch
          compressed
          id="encodeUrl"
          name="encode_url"
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
          checked={options.encode_url ?? DEFAULT_EXTERNAL_LINK_OPTIONS.encode_url}
          onChange={() => onOptionChange({ ...options, encode_url: !options.encode_url })}
          data-test-subj="urlDrilldownEncodeUrl"
        />
      </div>
    </EuiFormRow>
  );
};
