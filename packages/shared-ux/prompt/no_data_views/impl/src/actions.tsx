/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
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

  return (
    <>
      {canCreateNewDataView && (
        <EuiButton
          onClick={onClickCreate}
          iconType="plusInCircle"
          fill={true}
          data-test-subj="createDataViewButton"
          size="s"
        >
          {createDataViewText}
        </EuiButton>
      )}
      {canCreateNewDataView && onTryEsql && <EuiSpacer />}
      {onTryEsql && (
        <EuiText size="xs" color={'subdued'}>
          <FormattedMessage
            id="sharedUXPackages.no_data_views.esqlMessage"
            defaultMessage="Alternatively, you can query your data directly using ES|QL (technical preview)."
          />
          <EuiSpacer size={'s'} />
          <EuiButton color="success" onClick={onTryEsql} size="s">
            <FormattedMessage
              id="sharedUXPackages.no_data_views.esqlButtonLabel"
              defaultMessage="Try ES|QL"
            />
          </EuiButton>
        </EuiText>
      )}
    </>
  );
};
