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
  onTryESQL?: () => void;
  esqlDocLink?: string;
}

const createDataViewText = i18n.translate('sharedUXPackages.noDataViewsPrompt.addDataViewText', {
  defaultMessage: 'Create data view',
});

export const NoDataButtonLink = ({
  onClickCreate,
  canCreateNewDataView,
  onTryESQL,
  esqlDocLink,
}: NoDataButtonProps) => {
  if (!onTryESQL && !canCreateNewDataView) {
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
        >
          {createDataViewText}
        </EuiButton>
      )}
      {canCreateNewDataView && onTryESQL && <EuiSpacer />}
      {onTryESQL && (
        <EuiText size="xs" color={'subdued'}>
          <FormattedMessage
            id="sharedUXPackages.no_data_views.esqlMessage"
            defaultMessage="Alternatively, you can query your data directly using ES|QL (technical preview). {docsLink}"
            values={{
              docsLink: esqlDocLink && (
                <EuiLink href={esqlDocLink} target="_blank">
                  <FormattedMessage
                    id="sharedUXPackages.no_data_views.esqlDocsLink"
                    defaultMessage="Learn more."
                  />
                </EuiLink>
              ),
            }}
          />
          <EuiSpacer size={'s'} />
          <EuiButton color="success" onClick={onTryESQL} size="s" data-test-subj="tryESQLLink">
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
