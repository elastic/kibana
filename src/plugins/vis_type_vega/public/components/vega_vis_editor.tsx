/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiCodeEditor } from '@elastic/eui';
import compactStringify from 'json-stringify-pretty-compact';
import hjson from 'hjson';
import 'brace/mode/hjson';
import { i18n } from '@kbn/i18n';

import { VisOptionsProps } from 'src/plugins/vis_default_editor/public';
import { getNotifications } from '../services';
import { VisParams } from '../vega_fn';
import { VegaHelpMenu } from './vega_help_menu';
import { VegaActionsMenu } from './vega_actions_menu';

import './vega_editor.scss';

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

function format(
  value: string,
  stringify: typeof hjson.stringify | typeof compactStringify,
  options?: any
) {
  try {
    const spec = hjson.parse(value, { legacyRoot: false, keepWsc: true });
    return stringify(spec, options);
  } catch (err) {
    // This is a common case - user tries to format an invalid HJSON text
    getNotifications().toasts.addError(err, {
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

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaVisEditor as default };
