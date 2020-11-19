/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
