/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onDismissCallout: () => void;
}

export const SpaceCallout = ({ onDismissCallout }: Props) => (
  <>
    <EuiSpacer size="s" />
    <EuiCallOut
      announceOnMount
      size="s"
      title={
        <EuiFlexGroup component="span" alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem component="span">
            {i18n.translate('navigationCustomizationComponents.spaceCallout', {
              defaultMessage: 'Reorder or hide apps in this space without affecting other users.',
            })}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiButtonIcon
              iconType="cross"
              iconSize="s"
              color="primary"
              display="empty"
              size="xs"
              aria-label={i18n.translate('navigationCustomizationComponents.dismissCallout', {
                defaultMessage: 'Dismiss',
              })}
              onClick={() => {
                onDismissCallout();
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  </>
);
