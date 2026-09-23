/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
  KbnDangerCallout,
} from '@kbn/ui-callout';

export const CalloutInfo = () => (
  <KbnInfoCallout title="Information" text="Here is some important information for you." />
);

export const CalloutSuccess = () => (
  <KbnSuccessCallout title="Success!" text="The operation completed successfully." />
);

export const CalloutWarning = () => (
  <KbnWarningCallout
    title="Proceed with caution"
    text="This action may have unintended consequences."
  />
);

export const CalloutDanger = () => (
  <KbnDangerCallout title="Error" text="Something went wrong. Please try again." />
);

export const CalloutSmall = () => (
  <KbnInfoCallout title="Small callout for inline messages" size="s" />
);

export const CalloutTitleOnly = () => <KbnInfoCallout title="Callouts can exist as just a title" />;
