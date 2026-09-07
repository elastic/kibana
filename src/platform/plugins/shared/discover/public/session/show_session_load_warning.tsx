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
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DiscoverSessionPersistence } from './persistence';

/** Shows a session warning toast with access to the full warning details returned by the server. */
export const showSessionLoadWarning = ({
  warnings,
  core,
}: {
  warnings: Awaited<ReturnType<DiscoverSessionPersistence['get']>>['warnings'];
  core: Pick<CoreStart, 'notifications' | 'overlays' | 'rendering'>;
}): void => {
  const openModal = () => {
    const modal = core.overlays.openModal(
      toMountPoint(
        <EuiModal aria-labelledby="discoverSessionWarningDetailsTitle" onClose={() => modal.close()}>
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
    text: toMountPoint(
      <>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="discover.sessionLoadWarnings.text"
              defaultMessage="{warningCount, plural, one {One part of this session was omitted.} other {# parts of this session were omitted.}} Saving this session will keep only the content currently shown."
              values={{ warningCount: warnings.length }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton color="warning" size="s" onClick={openModal}>
              <FormattedMessage
                id="discover.sessionLoadWarnings.learnMoreButtonLabel"
                defaultMessage="Learn more"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>,
      core.rendering
    ),
    'data-test-subj': 'discoverSessionLoadWarning',
  });
};
