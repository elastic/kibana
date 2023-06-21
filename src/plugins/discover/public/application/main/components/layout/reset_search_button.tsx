/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

const resetSearchButtonWrapper = css`
  overflow: hidden;
`;

export const ResetSearchButton = ({ resetSavedSearch }: { resetSavedSearch?: () => void }) => {
  return (
    <EuiFlexItem grow={false} css={resetSearchButtonWrapper}>
      <EuiButtonEmpty
        iconType="refresh"
        data-test-subj="resetSavedSearch"
        onClick={resetSavedSearch}
        size="s"
        aria-label={i18n.translate('discover.reloadSavedSearchButton', {
          defaultMessage: 'Reset search',
        })}
      >
        <FormattedMessage id="discover.reloadSavedSearchButton" defaultMessage="Reset search" />
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
