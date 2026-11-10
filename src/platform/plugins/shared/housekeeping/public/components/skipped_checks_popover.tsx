/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { HousekeepingSkippedCheck } from '../../common';

const i18nTexts = {
  title: i18n.translate('housekeeping.skipped.popoverTitle', {
    defaultMessage: 'Checks that could not run',
  }),
  timeoutReason: i18n.translate('housekeeping.skipped.timeoutReason', {
    defaultMessage: 'Timed out',
  }),
};

/** The checks that did not run, behind a button, since they rarely need any action. */
export const SkippedChecksPopover = ({ skipped }: { skipped: HousekeepingSkippedCheck[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useGeneratedHtmlId();

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="s"
      aria-labelledby={titleId}
      button={
        <EuiButtonEmpty
          size="xs"
          flush="both"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          data-test-subj="housekeepingSkippedChecks"
        >
          {i18n.translate('housekeeping.skipped.count', {
            defaultMessage: '{count, plural, one {# check} other {# checks}}',
            values: { count: skipped.length },
          })}
        </EuiButtonEmpty>
      }
    >
      <EuiPopoverTitle id={titleId} paddingSize="s">
        {i18nTexts.title}
      </EuiPopoverTitle>
      <EuiText size="s" css={{ maxWidth: 400 }} data-test-subj="housekeepingSkippedChecksDetails">
        <ul>
          {skipped.map(({ checkId, checkTitle, reason, message }) => (
            <li key={checkId}>
              <strong>{checkTitle}</strong>:{' '}
              {reason === 'timeout' ? i18nTexts.timeoutReason : message}
            </li>
          ))}
        </ul>
      </EuiText>
    </EuiPopover>
  );
};
