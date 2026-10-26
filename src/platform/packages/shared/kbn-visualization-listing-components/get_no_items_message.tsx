/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiIllustration, useEuiTheme } from '@elastic/eui';
import { searchAnalyticsDataviz } from '@elastic/eui-illustrations';
import { FormattedMessage } from '@kbn/i18n-react';

const NoItemsMessage = ({ createItem }: { createItem: () => void }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiEmptyPrompt
      icon={
        <EuiIllustration
          type={searchAnalyticsDataviz}
          alt=""
          fullWidth={false}
          css={{ inlineSize: euiTheme.base * 8 }}
        />
      }
      title={
        <h1 id="visualizeListingHeading" data-test-subj="emptyListPrompt">
          <FormattedMessage
            id="visualizations.listing.createNew.title"
            defaultMessage="Create your first visualization"
          />
        </h1>
      }
      body={
        <p>
          <FormattedMessage
            id="visualizations.listing.createNew.description"
            defaultMessage="You can create different visualizations based on your data."
          />
        </p>
      }
      actions={
        <EuiButton
          onClick={createItem}
          color="text"
          iconType="plusCircle"
          data-test-subj="newItemButton"
        >
          <FormattedMessage
            id="visualizations.listing.createNew.createButtonLabel"
            defaultMessage="Create visualization"
          />
        </EuiButton>
      }
    />
  );
};

export const getNoItemsMessage = (createItem: () => void) => (
  <NoItemsMessage createItem={createItem} />
);
