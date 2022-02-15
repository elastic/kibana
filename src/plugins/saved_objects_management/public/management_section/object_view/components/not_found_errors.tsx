/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import { DocLinksStart } from '../../../../../../core/public';

interface NotFoundErrors {
  type: string;
  docLinks: DocLinksStart['links'];
}
const savedObjectsApisLinkText = i18n.translate(
  'savedObjectsManagement.view.howToFixErrorDescriptionLinkText',
  {
    defaultMessage: 'Saved objects APIs',
  }
);

export const NotFoundErrors = ({ type, docLinks }: NotFoundErrors) => {
  const getMessage = () => {
    switch (type) {
      case 'search':
        return (
          <FormattedMessage
            id="savedObjectsManagement.view.savedSearchDoesNotExistErrorMessage"
            defaultMessage="The saved search associated with this object no longer exists."
          />
        );
      case 'index-pattern':
        return (
          <FormattedMessage
            id="savedObjectsManagement.view.indexPatternDoesNotExistErrorMessage"
            defaultMessage="The data view associated with this object no longer exists."
          />
        );
      case 'index-pattern-field':
        return (
          <FormattedMessage
            id="savedObjectsManagement.view.fieldDoesNotExistErrorMessage"
            defaultMessage="A field associated with this object no longer exists in the data view."
          />
        );
      default:
        return null;
    }
  };

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="savedObjectsManagement.view.savedObjectProblemErrorMessage"
          defaultMessage="There is a problem with this saved object"
        />
      }
      iconType="alert"
      color="danger"
    >
      <div>{getMessage()}</div>
      <div>
        <FormattedMessage
          id="savedObjectsManagement.view.howToFixErrorDescription"
          defaultMessage="If you know what this error means, you can use the {savedObjectsApis} to fix it &mdash; otherwise click the delete button above."
          values={{
            savedObjectsApis: (
              <EuiLink
                aria-label={savedObjectsApisLinkText}
                href={`${docLinks.management.savedObjectsApiList}`}
                target="_blank"
              >
                {savedObjectsApisLinkText}
              </EuiLink>
            ),
          }}
        />
      </div>
    </EuiCallOut>
  );
};
