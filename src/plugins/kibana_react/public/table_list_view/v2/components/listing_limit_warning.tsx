/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint react-hooks/exhaustive-deps: 2 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props<T> {
  entityNamePlural: string;
  canEditAdvancedSettings: boolean;
  advancedSettingsLink: string;
  totalItems: number;
  listingLimit: number;
}

export function ListingLimitWarning<T>({
  entityNamePlural,
  totalItems,
  listingLimit,
  canEditAdvancedSettings,
  advancedSettingsLink,
}: Props<T>) {
  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="kibana-react.tableListView.listing.listingLimitExceededTitle"
            defaultMessage="Listing limit exceeded"
          />
        }
        color="warning"
        iconType="help"
      >
        <p>
          {canEditAdvancedSettings ? (
            <FormattedMessage
              id="kibana-react.tableListView.listing.listingLimitExceededDescription"
              defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
                the table below from displaying more than {listingLimitValue}. You can change this setting under {advancedSettingsLink}."
              values={{
                entityNamePlural,
                totalItems,
                listingLimitValue: listingLimit,
                listingLimitText: <strong>listingLimit</strong>,
                advancedSettingsLink: (
                  <EuiLink href={advancedSettingsLink}>
                    <FormattedMessage
                      id="kibana-react.tableListView.listing.listingLimitExceeded.advancedSettingsLinkText"
                      defaultMessage="Advanced Settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="kibana-react.tableListView.listing.listingLimitExceededDescriptionNoPermissions"
              defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
                  the table below from displaying more than {listingLimitValue}. Contact your system administrator to change this setting."
              values={{
                entityNamePlural,
                totalItems,
                listingLimitValue: listingLimit,
                listingLimitText: <strong>listingLimit</strong>,
              }}
            />
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
