/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiToolTip, EuiFlexItem, EuiTitle, EuiButtonIcon } from '@elastic/eui';
import { IIndexPattern } from 'src/plugins/data/public';

interface IndexHeaderProps {
  indexPattern: IIndexPattern;
  defaultIndex?: string;
  setDefault?: () => void;
  deleteIndexPatternClick?: () => void;
}

const setDefaultAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.setDefaultAria',
  {
    defaultMessage: 'Set as default index.',
  }
);

const setDefaultTooltip = i18n.translate(
  'indexPatternManagement.editIndexPattern.setDefaultTooltip',
  {
    defaultMessage: 'Set as default index.',
  }
);

const removeAriaLabel = i18n.translate('indexPatternManagement.editIndexPattern.removeAria', {
  defaultMessage: 'Remove index pattern.',
});

const removeTooltip = i18n.translate('indexPatternManagement.editIndexPattern.removeTooltip', {
  defaultMessage: 'Remove index pattern.',
});

export function IndexHeader({
  defaultIndex,
  indexPattern,
  setDefault,
  deleteIndexPatternClick,
}: IndexHeaderProps) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem>
        <EuiTitle>
          <h1 data-test-subj="indexPatternTitle">{indexPattern.title}</h1>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false}>
          {defaultIndex !== indexPattern.id && setDefault && (
            <EuiFlexItem>
              <EuiToolTip content={setDefaultTooltip}>
                <EuiButtonIcon
                  color="text"
                  onClick={setDefault}
                  iconType="starFilled"
                  aria-label={setDefaultAriaLabel}
                  data-test-subj="setDefaultIndexPatternButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}

          {deleteIndexPatternClick && (
            <EuiFlexItem>
              <EuiToolTip content={removeTooltip}>
                <EuiButtonIcon
                  color="danger"
                  onClick={deleteIndexPatternClick}
                  iconType="trash"
                  aria-label={removeAriaLabel}
                  data-test-subj="deleteIndexPatternButton"
                />
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
