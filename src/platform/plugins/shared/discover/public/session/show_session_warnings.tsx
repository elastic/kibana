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
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionWarning } from '../../server';

/** Shows a warning toast with details of the session content omitted during loading. */
export const showSessionWarnings = ({
  session,
  warnings,
  core,
}: {
  session: DiscoverSession;
  warnings: DiscoverSessionWarning[];
  core: Pick<CoreStart, 'notifications' | 'overlays' | 'rendering'>;
}) => {
  const openModal = () => {
    const warningDetails = warnings.map((warning, index) => {
      const tabName =
        session.tabs.find((tab) => tab.id === warning.tab_id)?.label || warning.tab_id;
      const title =
        warning.type === 'dropped_panel'
          ? i18n.translate('discover.sessionLoadWarnings.controlTitle', {
              defaultMessage: 'Tab "{tabName}": control "{controlId}"',
              values: { tabName, controlId: warning.panel_id },
            })
          : i18n.translate('discover.sessionLoadWarnings.propertyTitle', {
              defaultMessage: 'Tab "{tabName}": property "{property}"',
              values: { tabName, property: warning.key },
            });

      return (
        <li key={`${index}-${warning.tab_id}`}>
          <strong>{title}</strong>
          <p css={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{warning.message}</p>
        </li>
      );
    });

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
            <EuiText size="s">
              <ul>{warningDetails}</ul>
            </EuiText>
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
};
