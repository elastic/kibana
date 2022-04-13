/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const CallOuts = () => {
  return (
    <div>
      <EuiCallOut
        title={
          <FormattedMessage
            id="advancedSettings.callOutCautionTitle"
            defaultMessage="Caution: You can break stuff here"
          />
        }
        color="warning"
        iconType="bolt"
      >
        <p>
          <FormattedMessage
            id="advancedSettings.callOutCautionDescription"
            defaultMessage="Be careful in here, these settings are for very advanced users only.
            Tweaks you make here can break large portions of Kibana.
            Some of these settings may be undocumented, unsupported or in technical preview.
            If a field has a default value, blanking the field will reset it to its default which may be
            unacceptable given other configuration directives.
            Deleting a custom setting will permanently remove it from Kibana's config."
          />
        </p>
      </EuiCallOut>
    </div>
  );
};
