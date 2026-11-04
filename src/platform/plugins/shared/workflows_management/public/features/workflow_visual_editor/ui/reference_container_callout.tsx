/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { ReferenceToken } from '../lib/reference_tokens';
import { containerName } from '../lib/reference_tokens';

/** Warns that a list or record can't sit inside a sentence, with a one-click JSON-text fix. */
export function ContainerInSentenceCallout({
  token,
  onFix,
  onDismiss,
  testSubj,
}: {
  readonly token: ReferenceToken;
  readonly onFix: () => void;
  readonly onDismiss: () => void;
  readonly testSubj: string;
}) {
  const { euiTheme } = useEuiTheme();
  return (
    <KbnWarningCallout
      size="s"
      announceOnMount={false}
      title={i18n.translate('workflows.stepConfigPanel.referenceCallout.title', {
        defaultMessage: "A {type} can't go inside a sentence as it is",
        values: { type: containerName(token.iconType) },
      })}
      text={i18n.translate('workflows.stepConfigPanel.referenceCallout.body', {
        defaultMessage: "Insert it as JSON text to show what's in it.",
      })}
      actionProps={{
        primary: {
          children: i18n.translate('workflows.stepConfigPanel.referenceCallout.insertAsJson', {
            defaultMessage: 'Insert as JSON text',
          }),
          onClick: onFix,
          'data-test-subj': `${testSubj}-insertAsJson`,
        },
        secondary: {
          children: i18n.translate('workflows.stepConfigPanel.referenceCallout.keepAsIs', {
            defaultMessage: 'Keep as is',
          }),
          onClick: onDismiss,
          'data-test-subj': `${testSubj}-keepAsIs`,
        },
      }}
      css={{ marginBlockStart: euiTheme.size.xs }}
      data-test-subj={`${testSubj}-containerCallout`}
    />
  );
}
