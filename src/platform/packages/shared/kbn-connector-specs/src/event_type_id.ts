/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Max length for `ConnectorSpec.metadata.id` (action / connector type id, e.g. `.slack2`).
 * Distinct from Actions saved-object connector instance ids (`CONNECTOR_ID_MAX_LENGTH` = 36).
 */
export const MAX_CONNECTOR_TYPE_ID_LENGTH = 64;

/**
 * Connector eventId namespace — strips leading dot.
 * `.myConnector` → `myConnector`
 */
export const connectorTypeToEventNamespace = (connectorTypeId: string): string =>
  connectorTypeId.startsWith('.') ? connectorTypeId.slice(1) : connectorTypeId;

/**
 * URL `{connector_type_id}` → canonical actionTypeId for connector SO lookup.
 * `myConnector` → `.myConnector`
 */
export const normalizeConnectorTypeId = (typeId: string): string =>
  typeId.startsWith('.') ? typeId : `.${typeId}`;

/**
 * Public event id: `{connectorTypeIdWithoutDot}.{eventKey}`
 * e.g. `.myConnector` + `received` → `myConnector.received`
 */
export const buildEventId = (connectorTypeId: string, eventKey: string): string =>
  `${connectorTypeToEventNamespace(connectorTypeId)}.${eventKey}`;
