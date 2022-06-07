/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut, EuiSpacer, EuiLink } from '@elastic/eui';
import * as React from 'react';
import { i18n } from '@kbn/i18n';

const txtDismiss = i18n.translate(
  'uiActionsEnhanced.drilldowns.containers.drilldownList.copyingNotification.dismiss',
  {
    defaultMessage: 'Dismiss',
    description: 'Dismiss button in cloning notification callout.',
  }
);

const txtBody = (count: number) =>
  i18n.translate('uiActionsEnhanced.drilldowns.containers.drilldownList.copyingNotification.body', {
    defaultMessage: '{count, number} {count, plural, one {drilldown} other {drilldowns}} copied.',
    description: 'Title of notification show when one or more drilldowns were copied.',
    values: {
      count,
    },
  });

export interface CloningNotificationProps {
  count?: number;
}

export const CloningNotification: React.FC<CloningNotificationProps> = ({ count = 1 }) => {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const title = (
    <>
      {txtBody(count)} <EuiLink onClick={() => setDismissed(true)}>{txtDismiss}</EuiLink>
    </>
  );

  return (
    <>
      <EuiCallOut title={title} color="success" size="s" iconType="check" />
      <EuiSpacer />
    </>
  );
};
