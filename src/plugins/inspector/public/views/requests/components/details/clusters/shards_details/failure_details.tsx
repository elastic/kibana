/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlyout, EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

interface Props {
  failure: ShardFailure;
  onClose: () => void;
}

export function FailureDetails({ failure, onClose }: Props) {
  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h1>{i18n.translate('inspector.requests.shardsDetails.flyoutTitle', {
            defaultMessage: 'Shard failure',
          })}</h1>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <div>details</div>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty
          iconType="cross"
          onClick={onClose}
          flush="left"
        >
          {i18n.translate('inspector.requests.shardsDetails.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>

    </EuiFlyout>
  );
}