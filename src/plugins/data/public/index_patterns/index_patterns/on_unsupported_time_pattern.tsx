/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { CoreStart } from 'kibana/public';
import { toMountPoint } from '../../../../kibana_react/public';

export const onUnsupportedTimePattern = (
  toasts: CoreStart['notifications']['toasts'],
  navigateToApp: CoreStart['application']['navigateToApp']
) => ({ id, title, index }: { id: string; title: string; index: string }) => {
  const warningTitle = i18n.translate('data.indexPatterns.warningTitle', {
    defaultMessage: 'Support for time interval index patterns removed',
  });

  const warningText = i18n.translate('data.indexPatterns.warningText', {
    defaultMessage:
      'Currently querying all indices matching {index}. {title} should be migrated to a wildcard-based index pattern.',
    values: { title, index },
  });

  // kbnUrl was added to this service in #35262 before it was de-angularized, and merged in a PR
  // directly against the 7.x branch. Index patterns were de-angularized in #39247, and in order
  // to preserve the functionality from #35262 we need to get the injector here just for kbnUrl.
  // This has all been removed as of 8.0.

  // 2019-12-01 The usage of kbnUrl had to be removed due to the transition to NP.
  // It's now temporarily replaced by a simple replace of the single argument used by all URLs.
  // Once kbnUrl is migrated to NP, this can be updated.

  toasts.addWarning({
    title: warningTitle,
    text: toMountPoint(
      <div>
        <p>{warningText}</p>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              onClick={() =>
                navigateToApp('management', {
                  path: `/kibana/index_patterns/index_pattern/${id! || ''}`,
                })
              }
            >
              <FormattedMessage
                id="data.indexPatterns.editIndexPattern"
                defaultMessage="Edit index pattern"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    ),
  });
};
