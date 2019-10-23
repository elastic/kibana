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

import React, { useCallback } from 'react';
import { EuiCodeEditor } from '@elastic/eui';
import compactStringify from 'json-stringify-pretty-compact';
// @ts-ignore
import hjson from 'hjson';
import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';
import { VisOptionsProps } from 'ui/vis/editors/default';
import { VisParams } from '../vega_fn';
import { VegaHelpMenu } from './vega_help_menu';
import { VegaActionsMenu } from './vega_actions_menu';

const aceOptions = {
  maxLines: Infinity,
  highlightActiveLine: false,
  showPrintMargin: false,
  tabSize: 2,
  useSoftTabs: true,
  wrap: true,
};

const hjsonStringifyOptions = {
  bracesSameLine: true,
  keepWsc: true,
};

function format(value: string, stringify: typeof compactStringify, options?: any) {
  try {
    const spec = hjson.parse(value, { legacyRoot: false, keepWsc: true });
    return stringify(spec, options);
  } catch (err) {
    // This is a common case - user tries to format an invalid HJSON text
    toastNotifications.addError(err, {
      title: i18n.translate('visTypeVega.editor.formatError', {
        defaultMessage: 'Error formatting spec',
      }),
    });

    return value;
  }
}

function VegaVisEditor({ stateParams, setValue }: VisOptionsProps<VisParams>) {
  const onChange = useCallback(
    (value: string) => {
      setValue('spec', value);
    },
    [setValue]
  );

  const formatJson = useCallback(
    () => setValue('spec', format(stateParams.spec, compactStringify)),
    [setValue, stateParams.spec]
  );

  const formatHJson = useCallback(
    () => setValue('spec', format(stateParams.spec, hjson.stringify, hjsonStringifyOptions)),
    [setValue, stateParams.spec]
  );

  return (
    <div className="vgaEditor">
      <EuiCodeEditor
        data-test-subj="vega-editor"
        mode="hjson"
        theme="textmate"
        width="100%"
        height="auto"
        onChange={onChange}
        value={stateParams.spec}
        setOptions={aceOptions}
      />
      <div className="vgaEditor__aceEditorActions">
        <VegaHelpMenu />
        <VegaActionsMenu formatHJson={formatHJson} formatJson={formatJson} />
      </div>
    </div>
  );
}

export { VegaVisEditor };
