/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { MetaBlocks } from '@kbn/flyout-meta-blocks';
import type { HousekeepingFindingsResponse } from '../../common';
import { SkippedChecksPopover } from './skipped_checks_popover';

const i18nTexts = {
  lastChecked: i18n.translate('housekeeping.summary.lastChecked', {
    defaultMessage: 'Last checked',
  }),
  notChecked: i18n.translate('housekeeping.summary.notChecked', {
    defaultMessage: 'Not checked',
  }),
};

interface SummaryPanelProps {
  response: HousekeepingFindingsResponse;
  loadedAt?: number;
}

/** The meta blocks of a flyout header; the counts of each kind are above the list. */
export const SummaryPanel = ({ response, loadedAt }: SummaryPanelProps) =>
  loadedAt ? (
    <MetaBlocks
      items={[
        {
          id: 'lastChecked',
          title: i18nTexts.lastChecked,
          value: moment(loadedAt).fromNow(),
          'data-test-subj': 'housekeepingLastChecked',
        },
        ...(response.skipped.length > 0
          ? [
              {
                id: 'notChecked',
                title: i18nTexts.notChecked,
                value: <SkippedChecksPopover skipped={response.skipped} />,
              },
            ]
          : []),
      ]}
    />
  ) : null;
