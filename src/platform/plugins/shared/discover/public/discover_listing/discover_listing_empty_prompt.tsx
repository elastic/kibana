/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface DiscoverListingEmptyPromptProps {
  createItem: () => void;
  goToDiscover: () => void;
}

export const DiscoverListingEmptyPrompt: React.FC<DiscoverListingEmptyPromptProps> = ({
  createItem,
  goToDiscover,
}) => {
  return (
    <EuiEmptyPrompt
      iconType="discoverApp"
      title={
        <h2>
          <FormattedMessage
            id="discover.listing.emptyPrompt.title"
            defaultMessage="No Discover sessions found"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="discover.listing.emptyPrompt.description"
            defaultMessage="Get started by creating a new Discover session or exploring your data."
          />
        </p>
      }
      actions={[
        <EuiButton key="create" fill onClick={createItem}>
          <FormattedMessage
            id="discover.listing.emptyPrompt.createButton"
            defaultMessage="Create session"
          />
        </EuiButton>,
        <EuiButton key="explore" onClick={goToDiscover}>
          <FormattedMessage
            id="discover.listing.emptyPrompt.exploreButton"
            defaultMessage="Explore data"
          />
        </EuiButton>,
      ]}
    />
  );
};

