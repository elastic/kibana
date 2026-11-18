/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

interface ManagedWorkflowsOffCalloutProps {
  onTurnOn: () => Promise<void>;
}

/**
 * EuiCallOut size s. The small size uses the component's tighter type and
 * vertical padding. The action stays beside the text on this page.
 * Shown only when the user can change Advanced Settings.
 */
export function ManagedWorkflowsOffCallout({ onTurnOn }: ManagedWorkflowsOffCalloutProps) {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;
  const [dismissed, setDismissed] = useState(false);
  const [isTurningOn, setIsTurningOn] = useState(false);
  const canChangeSetting = application.capabilities.advancedSettings?.save === true;

  if (!canChangeSetting || dismissed) {
    return null;
  }

  return (
    <div
      css={css`
        .euiCallOut > div:first-child {
          flex-direction: row;
          align-items: center;
          gap: ${euiTheme.size.l};
        }

        .euiCallOut [data-test-subj='managed-workflows-off-callout__actions'] {
          margin-inline-start: 0;
          align-self: center;
          flex-shrink: 0;
        }
      `}
    >
      <EuiCallOut
        announceOnMount
        color="primary"
        size="s"
        title={i18n.translate('workflows.managedOffCallout.title', {
          defaultMessage: 'Workflows hidden',
        })}
        text={i18n.translate('workflows.managedOffCallout.body', {
          defaultMessage:
            "Workflows provided by Elastic aren't shown in this list, turn on Managed workflows to see them.",
        })}
        onDismiss={() => setDismissed(true)}
        actionProps={{
          primary: {
            children: i18n.translate('workflows.managedOffCallout.turnOn', {
              defaultMessage: 'Turn on Managed Workflows',
            }),
            isLoading: isTurningOn,
            onClick: () => {
              setIsTurningOn(true);
              void onTurnOn().finally(() => setIsTurningOn(false));
            },
            'data-test-subj': 'managed-workflows-off-turn-on',
          },
        }}
        data-test-subj="managed-workflows-off-callout"
      />
    </div>
  );
}
