/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

// export const SomeComponent = () => {
//   const label = '123';

//   return (
//     <legend>
//       <FormattedMessage
//         id="with_value"
//         defaultMessage="Set color for value {legendDataLabel}"
//         values={{ legendDataLabel: label }}
//       />

//       <FormattedMessage id="standard_message" defaultMessage="Reset color" />
//     </legend>
//   )
// }

const ignoreTagAsAFlag = (
  <FormattedMessage
    id="ignore_flag_without_equals_true"
    defaultMessage="Replace <PROJECT_ID> in the following command with your project ID and copy the command"
    ignoreTag
  />
);
