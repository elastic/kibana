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
import type { VegaByValueState } from '../../server/embeddable/schema';
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

export function VegaSpecEditor({
  editorValue,
  initialFormat,
  onChange,
  onFormatChange,
}: {
  editorValue: string;
  initialFormat?: VegaByValueState['spec']['format'];
  onChange: (value: string) => void;
  onFormatChange?: (format: VegaByValueState['spec']['format']) => void;
}) {
  const styles = useMemoCss(vegaVisStyles);
  const monacoStyles = useMemoCss(monacoOverride);
  const [languageId, setLanguageId] = useState<string>();

  useMount(() => {
    let fmt: VegaByValueState['spec']['format'];
    try {
      if (!initialFormat) JSON.parse(editorValue);
      fmt = initialFormat ?? 'json';
    } catch {
      fmt = 'hjson';
    }
    setLanguageId(fmt === 'json' ? XJsonLang.ID : HJSON_LANG_ID);
    onFormatChange?.(fmt);
  });

  const setSpec = useCallback(
    (value: string, specLang?: string) => {
      onChange(value);
      if (specLang) {
        setLanguageId(specLang);
        onFormatChange?.(specLang === HJSON_LANG_ID ? 'hjson' : 'json');
      }
    },
    [onChange, onFormatChange]
  );

  const handleChange = useCallback((value: string) => setSpec(value), [setSpec]);

  const formatJson = useCallback(() => {
    const { value: formattedValue, isValid } = format(editorValue, prettyCompactStringify);

    if (isValid) {
      setSpec(formattedValue, XJsonLang.ID);
    }
  }, [editorValue, setSpec]);

  const formatHJson = useCallback(() => {
    const { value: formattedValue, isValid } = format(editorValue, hjson.stringify, {
      bracesSameLine: true,
      keepWsc: true,
    });

    if (isValid) {
      setSpec(formattedValue, HJSON_LANG_ID);
    }
  }, [editorValue, setSpec]);

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
        value={editorValue}
        onChange={handleChange}
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

function VegaVisEditor({ stateParams, setValue }: VisEditorOptionsProps<VisParams>) {
  return (
    <VegaSpecEditor editorValue={stateParams.spec} onChange={(value) => setValue('spec', value)} />
  );
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VegaVisEditor as default };
