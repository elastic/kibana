/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonIcon, EuiPageHeader, EuiToolTip } from '@elastic/eui';
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

export const IndexHeader: React.FC<IndexHeaderProps> = ({
  defaultIndex,
  indexPattern,
  setDefault,
  deleteIndexPatternClick,
  children,
}) => {
  return (
    <EuiPageHeader
      pageTitle={<span data-test-subj="indexPatternTitle">{indexPattern.title}</span>}
      rightSideItems={[
        defaultIndex !== indexPattern.id && setDefault && (
          <EuiToolTip content={setDefaultTooltip}>
            <EuiButtonIcon
              color="text"
              onClick={setDefault}
              iconType="starFilled"
              aria-label={setDefaultAriaLabel}
              data-test-subj="setDefaultIndexPatternButton"
            />
          </EuiToolTip>
        ),
        deleteIndexPatternClick && (
          <EuiToolTip content={removeTooltip}>
            <EuiButtonIcon
              color="danger"
              onClick={deleteIndexPatternClick}
              iconType="trash"
              aria-label={removeAriaLabel}
              data-test-subj="deleteIndexPatternButton"
            />
          </EuiToolTip>
        ),
      ].filter(Boolean)}
    >
      {children}
    </EuiPageHeader>
  );
};
