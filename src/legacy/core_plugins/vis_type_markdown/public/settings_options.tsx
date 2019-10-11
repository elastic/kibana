/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'ui/vis/editors/default';
import { RangeOption, SwitchOption } from '../../kbn_vislib_vis_types/public/components';
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

export { SettingsOptions };
