/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';

export const DiscoverError = ({ error }: { error: Error }) => {
  const history = useHistory();

  const goToMain = () => {
    history.push('/');
  };

  return (
    <EuiEmptyPrompt
      paddingSize="l"
      iconType="alert"
      iconColor="danger"
      title={
        <h2>
          {i18n.translate('discover.discoverError.title', {
            defaultMessage: 'Cannot load this page',
          })}
        </h2>
      }
      body={<p>{error.message}</p>}
      actions={
        <EuiButton color="primary" fill onClick={goToMain}>
          <FormattedMessage
            id="discover.goToDiscoverMainViewButtonText"
            defaultMessage="Go to Discover main view"
          />
        </EuiButton>
      }
    />
  );
};
