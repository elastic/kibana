/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { XJsonLang } from '@kbn/monaco';
import useMount from 'react-use/lib/useMount';
import hjson from 'hjson';

import React, { useCallback, useState } from 'react';
import { prettyCompactStringify } from '@kbn/std';
import { i18n } from '@kbn/i18n';

import type { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { CodeEditor, HJSON_LANG_ID } from '@kbn/code-editor';
import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { getNotifications } from '../services';
import type { VisParams } from '../vega_fn';
import { VegaHelpMenu } from './vega_help_menu';
import { VegaActionsMenu } from './vega_actions_menu';

function format(
  value: string,
  stringify: typeof hjson.stringify | typeof prettyCompactStringify,
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

const vegaVisStyles = {
  base: css({
    '&.vgaEditor': {
      width: '100%',
      flexGrow: 1,

      '.kibanaCodeEditor': {
        width: '100%',
      },
    },
  }),
  editorActions: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      zIndex: euiTheme.levels.flyout,
      top: euiTheme.size.s,
      // Adjust for sidebar collapse button
      right: euiTheme.size.xxl,
      lineHeight: 1,
    }),
};

const monacoOverride = {
  override: ({ colorMode }: UseEuiTheme) =>
    css({
      // See discussion: https://github.com/elastic/kibana/issues/228296#issuecomment-3126033291
      ...(colorMode === 'DARK' && {
        '.monaco-editor': {
          '--vscode-editor-inactiveSelectionBackground': '#3a3d41',
        },
      }),
    }),
};

function VegaVisEditor({ stateParams, setValue }: VisEditorOptionsProps<VisParams>) {
  const styles = useMemoCss(vegaVisStyles);
  const monacoStyles = useMemoCss(monacoOverride);
  const [languageId, setLanguageId] = useState<string>();

  useMount(() => {
    let specLang = XJsonLang.ID;
    try {
      JSON.parse(stateParams.spec);
    } catch {
      specLang = HJSON_LANG_ID;
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
    const { value, isValid } = format(stateParams.spec, prettyCompactStringify);

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
      setSpec(value, HJSON_LANG_ID);
    }
  }, [setSpec, stateParams.spec]);

  if (!languageId) {
    return null;
  }

  return (
    <div className="vgaEditor" data-test-subj="vega-editor" css={styles.base}>
      <div className="vgaEditor__editorActions" css={styles.editorActions}>
        <VegaHelpMenu />
        <VegaActionsMenu formatHJson={formatHJson} formatJson={formatJson} />
      </div>
      <CodeEditor
        classNameCss={monacoStyles.override}
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
