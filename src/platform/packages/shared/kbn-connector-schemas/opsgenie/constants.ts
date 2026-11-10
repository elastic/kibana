/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.opsgenie';
export const CONNECTOR_NAME = i18n.translate('connectors.opsgenie.title', {
  defaultMessage: 'Opsgenie',
});

export enum SUB_ACTION {
  CreateAlert = 'createAlert',
  CloseAlert = 'closeAlert',
}

export const MESSAGE_NON_EMPTY = i18n.translate(
  'xpack.stackConnectors.components.opsgenie.nonEmptyMessageField',
  {
    defaultMessage: 'must be populated with a value other than just whitespace',
  }
);

/** Opsgenie's create-alert `message` API limit. */
export const MESSAGE_MAX_LENGTH = 130;

/**
 * HTTP-facing schema bound for `message`. Matches the vendor `description` max so Mustache-expanded
 * messages can pass validation and be truncated to `MESSAGE_MAX_LENGTH`. Values above this still fail.
 */
export const MESSAGE_SCHEMA_MAX_LENGTH = 15000;
