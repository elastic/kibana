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
  onTryEsql?: () => void;
}

const createDataViewText = i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataViewText', {
  defaultMessage: 'Create data view',
});

export const NoDataButtonLink = ({
  onClickCreate,
  canCreateNewDataView,
  onTryEsql,
}: NoDataButtonProps) => {
  if (!onTryEsql && !canCreateNewDataView) {
    return null;
  }

  let tryEsqlPrompt = null;
  let createDataViewButton = null;
  let orDivider = null;

  if (onTryEsql) {
    tryEsqlPrompt = (
      <EuiText size="s">
        <FormattedMessage
          id="sharedUx.no_data_views.button"
          defaultMessage="Query your data directly with ES|QL (Beta).  "
        />
        <EuiLink onClick={onTryEsql}>Try ES|QL</EuiLink>
      </EuiText>
    );
  }

  if (canCreateNewDataView) {
    createDataViewButton = (
      <EuiButton
        onClick={onClickCreate}
        iconType="plusInCircle"
        fill={true}
        data-test-subj="createDataViewButton"
      >
        {createDataViewText}
      </EuiButton>
    );
  }

  if (canCreateNewDataView && onTryEsql) {
    orDivider = (
      <>
        <EuiSpacer size="m" />- OR -
        <EuiSpacer size="m" />
      </>
    );
  }

  return (
    <>
      {createDataViewButton}
      {orDivider}
      {tryEsqlPrompt}
    </>
  );
};
