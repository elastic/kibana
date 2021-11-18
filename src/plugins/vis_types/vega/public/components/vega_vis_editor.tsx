/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XJsonLang } from '@kbn/monaco';
import useMount from 'react-use/lib/useMount';
import hjson from 'hjson';

import React, { useCallback, useState } from 'react';
import compactStringify from 'json-stringify-pretty-compact';
import { i18n } from '@kbn/i18n';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { CodeEditor, HJsonLang } from '../../../../kibana_react/public';
import { getNotifications } from '../services';
import { VisParams } from '../vega_fn';
import { VegaHelpMenu } from './vega_help_menu';
import { VegaActionsMenu } from './vega_actions_menu';

import './vega_editor.scss';

function format(
  value: string,
  stringify: typeof hjson.stringify | typeof compactStringify,
  options?: any
) {
  try {
    const spec = hjson.parse(value, { legacyRoot: false, keepWsc: true });

    return {
      value: stringify(spec, options),
      isValid: true,
    };
  } catch (err) {
    // This is a common case - user tries to format an invalid HJSON text
    getNotifications().toasts.addError(err, {
      title: i18n.translate('visTypeVega.editor.formatError', {
        defaultMessage: 'Error formatting spec',
      }),
    });

    return { value, isValid: false };
  }
}

function VegaVisEditor({ stateParams, setValue }: VisEditorOptionsProps<VisParams>) {
  const [languageId, setLanguageId] = useState<string>();

  useMount(() => {
    let specLang = XJsonLang.ID;
    try {
      JSON.parse(stateParams.spec);
    } catch {
      specLang = HJsonLang;
    }
    setLanguageId(specLang);
  });

  const setSpec = useCallback(
    (value: string, specLang?: string) => {
      setValue('spec', value);
      if (specLang) {
        setLanguageId(specLang);
      }
    },
    [setValue]
  );

  const onChange = useCallback((value: string) => setSpec(value), [setSpec]);

  const formatJson = useCallback(() => {
    const { value, isValid } = format(stateParams.spec, compactStringify);

    if (isValid) {
      setSpec(value, XJsonLang.ID);
    }
  }, [setSpec, stateParams.spec]);

  const formatHJson = useCallback(() => {
    const { value, isValid } = format(stateParams.spec, hjson.stringify, {
      bracesSameLine: true,
      keepWsc: true,
    });

    if (isValid) {
      setSpec(value, HJsonLang);
    }
  }, [setSpec, stateParams.spec]);

  if (!languageId) {
    return null;
  }

  return (
    <div className="vgaEditor" data-test-subj="vega-editor">
      <div className="vgaEditor__editorActions">
        <VegaHelpMenu />
        <VegaActionsMenu formatHJson={formatHJson} formatJson={formatJson} />
      </div>
      <CodeEditor
        width="100%"
        height="100%"
        languageId={languageId}
        value={stateParams.spec}
        onChange={onChange}
        options={{
          lineNumbers: 'on',
          fontSize: 12,
          minimap: {
            enabled: false,
          },
          folding: true,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
      />
    </div>
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaVisEditor as default };
