/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KbnInfoCallout } from '@kbn/ui-callout';
import { txtHelpTitle, txtHelpText, txtViewDocsLinkLabel, txtHideHelpButtonLabel } from './i18n';

export interface DrilldownHelloBarProps {
  docsLink?: string;
  onHideClick?: () => void;
}

export const WELCOME_MESSAGE_TEST_SUBJ = 'drilldownsWelcomeMessage';

export const DrilldownHelloBar: React.FC<DrilldownHelloBarProps> = ({ docsLink, onHideClick }) => {
  return (
    <KbnInfoCallout
      title={txtHelpTitle}
      text={txtHelpText}
      actionProps={
        docsLink
          ? {
              primary: {
                href: docsLink,
                target: '_blank',
                children: txtViewDocsLinkLabel,
              },
            }
          : undefined
      }
      onDismiss={onHideClick}
      dismissButtonProps={{
        'aria-label': txtHideHelpButtonLabel,
      }}
      data-test-subj={WELCOME_MESSAGE_TEST_SUBJ}
    />
  );
};
