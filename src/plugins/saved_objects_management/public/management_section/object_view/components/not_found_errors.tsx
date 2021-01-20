/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
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
          defaultMessage="If you know what this error means, go ahead and fix it &mdash; otherwise click the delete button above."
        />
      </div>
    </EuiCallOut>
  );
};
