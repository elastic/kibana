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
