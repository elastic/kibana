/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiIconTip, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ungrouped } from '../translations';

export const RuleNameGroupContent = React.memo<{
  ruleName: string;
  tags?: string[] | undefined;
}>(({ ruleName, tags }) => {
  return (
    <div style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">{ruleName}</h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
RuleNameGroupContent.displayName = 'RuleNameGroup';

export const InstanceIdGroupContent = React.memo<{
  instanceId?: string;
}>(({ instanceId }) => {
  const isUngrouped = instanceId === '*';
  return (
    <div style={{ display: 'table', tableLayout: 'fixed', width: '100%' }}>
      <EuiFlexGroup data-test-subj="rule-name-group-renderer" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false} style={{ display: 'contents' }}>
          <EuiTitle size="xs">
            <h5 className="eui-textTruncate">
              {isUngrouped ? ungrouped : instanceId ?? '--'}
              &nbsp;
              {isUngrouped && (
                <EuiIconTip
                  content={
                    <FormattedMessage
                      id="xpack.observability.alert.grouping.ungrouped.info"
                      defaultMessage='There is no "group by" field selected in the rule definition.'
                    />
                  }
                />
              )}
            </h5>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});
InstanceIdGroupContent.displayName = 'InstanceIdGroupContent';
