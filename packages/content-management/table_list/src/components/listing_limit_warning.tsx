/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
            id="contentManagement.tableList.listing.listingLimitExceededTitle"
            defaultMessage="Listing limit exceeded"
          />
        }
        color="warning"
        iconType="help"
      >
        <p>
          <FormattedMessage
            id="contentManagement.tableList.listing.listingLimitExceededDescription"
            defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
    the table below from displaying more than {listingLimitValue}."
            values={{
              entityNamePlural,
              totalItems,
              listingLimitValue: listingLimit,
              listingLimitText: <strong>listingLimit</strong>,
            }}
          />{' '}
          {canEditAdvancedSettings ? (
            <FormattedMessage
              id="contentManagement.tableList.listing.listingLimitExceededDescriptionPermissions"
              defaultMessage="You can change this setting under {advancedSettingsLink}."
              values={{
                advancedSettingsLink: (
                  <EuiLink href={advancedSettingsLink}>
                    <FormattedMessage
                      id="contentManagement.tableList.listing.listingLimitExceeded.advancedSettingsLinkText"
                      defaultMessage="Advanced Settings"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="contentManagement.tableList.listing.listingLimitExceededDescriptionNoPermissions"
              defaultMessage="Contact your system administrator to change this setting."
            />
          )}
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
}
