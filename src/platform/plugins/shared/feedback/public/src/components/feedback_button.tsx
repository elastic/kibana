/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FeedbackForm } from './feedback_form';

interface Props {
  core: CoreStart;
  getLicense: LicensingPluginStart['getLicense'];
}

export const FeedbackButton = ({ core, getLicense }: Props) => {
  const openModal = () => {
    core.overlays.openModal(
      toMountPoint(
        <FeedbackForm
          getCurrentUser={core.security.authc.getCurrentUser}
          getLicense={getLicense}
        />,
        core.rendering
      )
    );
  };

  return (
    <EuiHeaderSectionItemButton
      data-test-subj="feedbackButton"
      aria-haspopup={true}
      aria-label={i18n.translate('feedback.button.ariaLabel', {
        defaultMessage: 'Give feedback',
      })}
      onClick={openModal}
    >
      <EuiIcon type="comment" size="m" />
    </EuiHeaderSectionItemButton>
  );
};
