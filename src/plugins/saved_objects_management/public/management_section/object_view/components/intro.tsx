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

export const Intro = () => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="savedObjectsManagement.view.howToModifyObjectTitle"
          defaultMessage="Proceed with caution!"
        />
      }
      iconType="alert"
      color="warning"
    >
      <div>
        <FormattedMessage
          id="savedObjectsManagement.view.howToModifyObjectDescription"
          defaultMessage="Modifying objects is for advanced users only. Object properties are not validated and invalid objects could cause errors, data loss, or worse. Unless someone with intimate knowledge of the code told you to be in here, you probably shouldn&rsquo;t be."
        />
      </div>
    </EuiCallOut>
  );
};
