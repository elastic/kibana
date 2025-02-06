/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FieldBadgeWithActions, FieldBadgeWithActionsProps } from './cell_actions_popover';
import {
  eventOutcomeFailureLabel,
  eventOutcomeSuccessLabel,
  eventOutcomeUnknownLabel,
} from './translations';

const FIELD_VALUE_TRANSLATIONS: Record<string, string> = {
  success: eventOutcomeSuccessLabel,
  failure: eventOutcomeFailureLabel,
  unknown: eventOutcomeUnknownLabel,
};

export const EventOutcomeBadgeWithActions = ({ value, ...props }: FieldBadgeWithActionsProps) => (
  <FieldBadgeWithActions value={FIELD_VALUE_TRANSLATIONS[value]} {...props} />
);
