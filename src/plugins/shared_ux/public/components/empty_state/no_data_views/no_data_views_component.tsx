/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCard } from '@elastic/eui';
import { NoResultsIllustration } from '../assets';

interface NoDataViewsComponentProps {
  onClick?: () => void;
  canCreateNewDataView: boolean;
}

export const NoDataViewsComponent = (props: NoDataViewsComponentProps) => {
  const { onClick, canCreateNewDataView } = props;
  const button = (
    <EuiButton color={'primary'} onClick={onClick}>
      {i18n.translate('sharedUX.noDataViewsPage.addDataViewText', {
        defaultMessage: 'Add a Data View',
      })}
    </EuiButton>
  );
  return (
    <EuiCard
      title={i18n.translate('sharedUX.noDataViewsPage.noDataViewsText', {
        defaultMessage: 'No Data Views',
      })}
      textAlign="center"
      description={i18n.translate('sharedUX.noDataViewsPage.descriptionText', {
        defaultMessage: 'You have data in Elasticsearch, but no data views',
      })}
      style={{ width: '50%', margin: 'auto', flexGrow: 0 }}
    >
      <div className="noResults__illustration">
        <NoResultsIllustration />
      </div>
      <div>{canCreateNewDataView && button}</div>
    </EuiCard>
  );
};
