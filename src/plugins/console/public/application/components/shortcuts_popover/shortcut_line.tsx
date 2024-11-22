/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface ShortcutLineFlexItemProps {
  id: string;
  description: string;
  keys: any[];
  alternativeKeys?: any[];
}

const renderKeys = (keys: string[]) => {
  return keys.map((key, index) => (
    <span key={index}>
      {index > 0 && ' + '}
      <EuiCode>{key}</EuiCode>
    </span>
  ));
};

export const ShortcutLineFlexItem = ({
  id,
  description,
  keys,
  alternativeKeys,
}: ShortcutLineFlexItemProps) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {i18n.translate('console.shortcutDescription.' + id, {
              defaultMessage: description,
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {renderKeys(keys)}
            {alternativeKeys && (
              <>
                <strong>
                  {' '}
                  {i18n.translate('console.shortcuts.alternativeKeysOrDivider', {
                    defaultMessage: 'or',
                  })}{' '}
                </strong>
                {renderKeys(alternativeKeys)}
              </>
            )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
