/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import { prettifyQuery, isQueryWrappedByPipes } from '@kbn/esql-utils';

export function QueryWrapComponent({
  code,
  updateQuery,
}: {
  code: string;
  updateQuery: (qs: string) => void;
}) {
  const isWrappedByPipes = useMemo(() => {
    return isQueryWrappedByPipes(code);
  }, [code]);

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        position="top"
        content={
          isWrappedByPipes
            ? i18n.translate(
                'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                {
                  defaultMessage: 'Remove line breaks on pipes',
                }
              )
            : i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel', {
                defaultMessage: 'Add line breaks on pipes',
              })
        }
      >
        <EuiButtonIcon
          iconType={isWrappedByPipes ? 'pipeNoBreaks' : 'pipeBreaks'}
          color="text"
          size="xs"
          data-test-subj="TextBasedLangEditor-toggleWordWrap"
          aria-label={
            isWrappedByPipes
              ? i18n.translate(
                  'textBasedEditor.query.textBasedLanguagesEditor.disableWordWrapLabel',
                  {
                    defaultMessage: 'Remove line breaks on pipes',
                  }
                )
              : i18n.translate(
                  'textBasedEditor.query.textBasedLanguagesEditor.EnableWordWrapLabel',
                  {
                    defaultMessage: 'Add line breaks on pipes',
                  }
                )
          }
          onClick={() => {
            const updatedCode = prettifyQuery(code, isWrappedByPipes);
            if (code !== updatedCode) {
              updateQuery(updatedCode);
            }
          }}
        />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
