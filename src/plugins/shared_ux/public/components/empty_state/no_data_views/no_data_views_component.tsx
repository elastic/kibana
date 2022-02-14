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
import { css } from '@emotion/react';
import { NoResultsIllustration } from '../assets';

interface NoDataViewsComponentProps {
  onClick?: () => void;
  canCreateNewDataView: boolean;
}

const addDataViewText = i18n.translate('sharedUX.noDataViewsPage.addDataViewText', {
  defaultMessage: 'Add a Data View',
});

const noDataViewsText = i18n.translate('sharedUX.noDataViewsPage.noDataViewsText', {
  defaultMessage: 'No Data Views',
});

const noDescriptionText = i18n.translate('sharedUX.noDataViewsPage.descriptionText', {
  defaultMessage: 'You have data in Elasticsearch, but no data views',
});

export const NoDataViewsComponent = (props: NoDataViewsComponentProps) => {
  const { onClick, canCreateNewDataView } = props;

  const componentCss = css`
    width: 50%;
    margin: auto;
    flex-grow: 0;
  `;

  const button = (
    <EuiButton color={'primary'} onClick={onClick}>
      {addDataViewText}
    </EuiButton>
  );
  return (
    <EuiCard
      title={noDataViewsText}
      textAlign="center"
      description={noDescriptionText}
      css={componentCss}
    >
      <div className="noResults__illustration">
        <NoResultsIllustration />
      </div>
      <div>{canCreateNewDataView && button}</div>
    </EuiCard>
  );
};
