/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface NoDataButtonProps {
  onClickCreate: (() => void) | undefined;
  canCreateNewDataView: boolean;
  showESQL: boolean;
  esqlLocator: string;
}

const createDataViewText = i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataViewText', {
  defaultMessage: 'Create data view',
});

export const NoDataButtonLink = ({
  onClickCreate,
  canCreateNewDataView,
  showESQL,
  esqlLocator,
}: NoDataButtonProps) => {
  if (canCreateNewDataView && !showESQL) {
    return (
      <EuiButton
        onClick={onClickCreate}
        iconType="plusInCircle"
        fill={true}
        data-test-subj="createDataViewButton"
      >
        {createDataViewText}
      </EuiButton>
    );
  } else if (showESQL) {
    return (
      <>
        <EuiButton
          onClick={onClickCreate}
          iconType="plusInCircle"
          fill={true}
          data-test-subj="createDataViewButton"
        >
          {createDataViewText}
        </EuiButton>
        <EuiSpacer size="m" />
        <EuiText>
          <FormattedMessage
            id="sharedUx.no_data_views.button"
            defaultMessage="Query your data directly with ES|QL (Beta)."
          />
        </EuiText>
        <EuiLink href="" target={'_blank'} external>
          Try ES|QL
        </EuiLink>
      </>
    );
  }
  return null;
};
