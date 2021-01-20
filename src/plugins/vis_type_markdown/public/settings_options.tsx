/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps, SwitchOption, RangeOption } from '../../vis_default_editor/public';
import { MarkdownVisParams } from './types';

function SettingsOptions({ stateParams, setValue }: VisOptionsProps<MarkdownVisParams>) {
  return (
    <EuiPanel paddingSize="s">
      <RangeOption
        label={i18n.translate('visTypeMarkdown.params.fontSizeLabel', {
          defaultMessage: 'Base font size in points',
        })}
        max={36}
        min={8}
        paramName="fontSize"
        showInput
        value={stateParams.fontSize}
        setValue={setValue}
      />

      <SwitchOption
        label={i18n.translate('visTypeMarkdown.params.openLinksLabel', {
          defaultMessage: 'Open links in new tab',
        })}
        paramName="openLinksInNewTab"
        value={stateParams.openLinksInNewTab}
        setValue={setValue}
      />
    </EuiPanel>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { SettingsOptions as default };
