/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionPersistence } from './persistence';

/** Loads a Discover session and warns when the server omitted unsupported content. */
export const loadDiscoverSession = async ({
  id,
  persistence,
  core,
}: {
  id: string;
  persistence: DiscoverSessionPersistence;
  core: Pick<CoreStart, 'notifications' | 'overlays' | 'rendering'>;
}): Promise<DiscoverSession> => {
  const { session, warnings } = await persistence.get(id);

  if (!warnings.length) {
    return session;
  }

  const openModal = () => {
    const modal = core.overlays.openModal(
      toMountPoint(
        <EuiModal
          aria-labelledby="discoverSessionWarningDetailsTitle"
          onClose={() => modal.close()}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id="discoverSessionWarningDetailsTitle">
              <FormattedMessage
                id="discover.sessionLoadWarnings.detailsTitle"
                defaultMessage="Warning details"
              />
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCodeBlock language="json" fontSize="m" paddingSize="s" isCopyable>
              {JSON.stringify(warnings, null, 2)}
            </EuiCodeBlock>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={() => modal.close()}>
              <FormattedMessage
                id="discover.sessionLoadWarnings.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiModalFooter>
        </EuiModal>,
        core.rendering
      )
    );
  };

  core.notifications.toasts.addWarning({
    title: i18n.translate('discover.sessionLoadWarnings.title', {
      defaultMessage: 'Some session content could not be loaded',
    }),
    text: i18n.translate('discover.sessionLoadWarnings.text', {
      defaultMessage:
        '{warningCount, plural, one {One part of this session was omitted.} other {# parts of this session were omitted.}} Saving this session will keep only the content currently shown.',
      values: { warningCount: warnings.length },
    }),
    actionProps: {
      primary: {
        onClick: openModal,
        children: i18n.translate('discover.sessionLoadWarnings.learnMoreButtonLabel', {
          defaultMessage: 'Learn more',
        }),
      },
    },
    'data-test-subj': 'discoverSessionLoadWarning',
  });

  return session;
};
