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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface EntityFlyoutProps {
  readonly serviceName: string;
  readonly onClose: () => void;
}

export const EntityFlyout = ({ serviceName, onClose }: EntityFlyoutProps) => {
  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="m"
      aria-labelledby="entityCentricLabFlyoutTitle"
      data-test-subj="entityCentricLabFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="entityCentricLabFlyoutTitle" data-test-subj="entityCentricLabFlyoutTitle">
                {serviceName}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('discover.entityCentricLab.flyout.labBadgeLabel', {
                defaultMessage: 'Lab',
              })}
              color="hollow"
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="discover.entityCentricLab.flyout.subtitle"
            defaultMessage="Service entity"
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="discover.entityCentricLab.flyout.placeholder"
              defaultMessage="Entity details for {serviceName} will appear here."
              values={{ serviceName: <strong>{serviceName}</strong> }}
            />
          </p>
          <p>
            <FormattedMessage
              id="discover.entityCentricLab.flyout.todo"
              defaultMessage="This is a placeholder. Health, dependencies, recent changes and SLOs will be added next."
            />
          </p>
        </EuiText>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
