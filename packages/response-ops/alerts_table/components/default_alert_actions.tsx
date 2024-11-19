/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useLoadRuleTypesQuery } from '@kbn/alerts-ui-shared/src/common/hooks';
import { ViewRuleDetailsAlertAction } from './view_rule_details_alert_action';
import type { AlertActionsProps } from '../types';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';
import { MuteAlertAction } from './mute_alert_action';
import { MarkAsUntrackedAlertAction } from './mark_as_untracked_alert_action';

/**
 * Common alerts table row actions
 */
export const DefaultAlertActions = (props: AlertActionsProps) => {
  const {
    http,
    notifications: { toasts },
  } = props;
  const { authorizedToCreateAnyRules } = useLoadRuleTypesQuery({
    filteredRuleTypes: [],
    http,
    toasts,
  });

  return (
    <>
      <ViewRuleDetailsAlertAction {...props} />
      <ViewAlertDetailsAlertAction {...props} />
      {authorizedToCreateAnyRules && <MarkAsUntrackedAlertAction {...props} />}
      {authorizedToCreateAnyRules && <MuteAlertAction {...props} />}
    </>
  );
};
