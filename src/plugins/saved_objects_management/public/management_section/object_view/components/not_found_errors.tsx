/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface NotFoundErrors {
  type: string;
}

export const NotFoundErrors = ({ type }: NotFoundErrors) => {
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
            defaultMessage="The index pattern associated with this object no longer exists."
          />
        );
      case 'index-pattern-field':
        return (
          <FormattedMessage
            id="savedObjectsManagement.view.fieldDoesNotExistErrorMessage"
            defaultMessage="A field associated with this object no longer exists in the index pattern."
          />
        );
      default:
        return null;
    }
  };

  return (
    <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="savedObjectsManagement.view.savedObjectProblemErrorMessage"
              defaultMessage="There is a problem with this saved object"
            />
          </h2>
        }
        body={
          <>
            <div>{getMessage()}</div>
            <p>
              <FormattedMessage
                id="savedObjectsManagement.view.howToFixErrorDescription"
                defaultMessage="If you know what this error means, go ahead and fix it &mdash; otherwise click the delete button above."
              />
            </p>
          </>
        }
      />
    </EuiPageContent>
  );
};
