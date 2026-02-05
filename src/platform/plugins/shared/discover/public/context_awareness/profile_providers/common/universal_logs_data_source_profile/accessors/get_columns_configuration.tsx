/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { LOG_LEVEL_FIELDS } from '../../../../../../common/data_types/logs/constants';
import type { DataSourceProfileProvider } from '../../../../profiles';

const CONTENT_LABEL = i18n.translate('discover.universalLogsProfile.columnsConfiguration.content', {
  defaultMessage: 'Content',
});

const LOG_LEVEL_LABEL = i18n.translate(
  'discover.universalLogsProfile.columnsConfiguration.logLevel',
  {
    defaultMessage: 'Log level',
  }
);

/**
 * Provides custom column configuration for log-specific fields
 * - Source column labeled as "Content"
 * - Log level fields get custom labels
 */
export const getColumnsConfiguration: DataSourceProfileProvider['profile']['getColumnsConfiguration'] =
  () => () => ({
    columns: {
      [SOURCE_COLUMN]: {
        renderAsLink: false,
        customLabel: CONTENT_LABEL,
      },
      ...LOG_LEVEL_FIELDS.reduce(
        (acc, field) => ({
          ...acc,
          [field]: {
            customLabel: LOG_LEVEL_LABEL,
            customHeader: (
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={LOG_LEVEL_LABEL}>
                    <EuiIcon type="stopFilled" size="s" />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem>{LOG_LEVEL_LABEL}</EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
        }),
        {}
      ),
    },
  });
