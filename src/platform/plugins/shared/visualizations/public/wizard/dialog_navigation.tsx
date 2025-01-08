/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiLink, EuiIcon, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface DialogNavigationProps {
  goBack: () => void;
}

function DialogNavigation(props: DialogNavigationProps) {
  return (
    <>
      <EuiLink data-test-subj="goBackLink" onClick={props.goBack}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="arrowLeft" />
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate('visualizations.newVisWizard.goBackLink', {
              defaultMessage: 'Select a different visualization',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
      <EuiSpacer />
    </>
  );
}

export { DialogNavigation };
