/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

export const CODE_ADDED_CLASS = 'esqlCodeAdded';
export const LINE_REPLACED_CLASS = 'esqlLineReplaced';
export const GENERATING_HINT_CLASS = 'esqlGeneratingHint';

const GENERATING_TEXT = i18n.translate('esqlEditor.commentToEsql.generating', {
  defaultMessage: 'Generating...',
});

export const useCommentToEsqlStyle = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => css`
      .${CODE_ADDED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightSuccess};
      }
      .${LINE_REPLACED_CLASS} {
        background-color: ${euiTheme.colors.backgroundLightWarning};
        text-decoration: line-through;
      }
      @keyframes esqlGeneratingPulse {
        0%,
        100% {
          opacity: 0.4;
        }
        50% {
          opacity: 0.75;
        }
      }
      .${GENERATING_HINT_CLASS}::after {
        content: ${JSON.stringify(' ' + GENERATING_TEXT)};
        font-style: italic;
        color: ${euiTheme.colors.textSubdued};
        animation: esqlGeneratingPulse 1.4s ease-in-out infinite;
      }
    `,
    [
      euiTheme.colors.backgroundLightSuccess,
      euiTheme.colors.backgroundLightWarning,
      euiTheme.colors.textSubdued,
    ]
  );
};
