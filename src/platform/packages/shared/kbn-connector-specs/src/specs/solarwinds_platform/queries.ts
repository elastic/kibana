/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SOLARWINDS_NODE_STATUSES,
  SOLARWINDS_SEVERITIES,
  type GetAlertInput,
  type GetNodeInput,
  type ListActiveAlertsInput,
  type SearchNodesInput,
} from './types';

export interface SwqlStatement {
  query: string;
  parameters: Record<string, unknown>;
}

const ALERT_COLUMNS = [
  'aa.AlertActiveID',
  'aa.AlertObjectID',
  'ac.AlertID',
  'ac.Name AS AlertName',
  'ac.Severity',
  'aa.TriggeredDateTime',
  'aa.TriggeredMessage',
  'aa.Acknowledged',
  'aa.AcknowledgedBy',
  'aa.AcknowledgedDateTime',
  'ao.EntityType',
  'ao.EntityCaption',
  'ao.EntityUri',
  'ao.RelatedNodeId AS NodeID',
  'ao.RelatedNodeCaption AS NodeCaption',
];

const ALERT_DETAIL_COLUMNS = [
  ...ALERT_COLUMNS,
  'ac.Description AS AlertDescription',
  'ac.ObjectType AS AlertObjectType',
  'ao.EntityDetailsUrl',
  'ao.AlertNote',
  'aa.NumberOfNotes',
];

const ALERT_FROM = [
  'FROM Orion.AlertActive aa',
  'INNER JOIN Orion.AlertObjects ao ON aa.AlertObjectID = ao.AlertObjectID',
  'INNER JOIN Orion.AlertConfigurations ac ON ao.AlertID = ac.AlertID',
].join(' ');

/** Never select `Community` or `RWCommunity`: they hold the node's SNMP community strings. */
const NODE_COLUMNS = [
  'n.NodeID',
  'n.Caption',
  'n.IPAddress',
  'n.DNS',
  'n.SysName',
  'n.Status',
  'n.StatusDescription',
  'n.Vendor',
  'n.MachineType',
  'n.ObjectSubType',
  'n.Location',
  'n.DetailsUrl',
];

const NODE_DETAIL_COLUMNS = [
  ...NODE_COLUMNS,
  'n.NodeDescription',
  'n.IOSVersion',
  'n.IOSImage',
  'n.Contact',
  'n.IsServer',
  'n.ResponseTime',
  'n.PercentLoss',
  'n.CPULoad',
  'n.PercentMemoryUsed',
  'n.LastBoot',
  'n.LastSync',
  'n.UnManaged',
  'n.UnManageFrom',
  'n.UnManageUntil',
  'n.EngineID',
  'n.Uri',
];

const pageClause = (limit: number, offset: number): string =>
  `WITH ROWS ${offset + 1} TO ${offset + limit} WITH TOTALROWS`;

const contains = (value: string): string => `%${value}%`;

/** SWIS cannot bind an array to `IN @name`, so each value gets its own `@name{index}` parameter. */
const inList = (
  name: string,
  values: readonly unknown[],
  parameters: Record<string, unknown>
): string => {
  const names = values.map((value, index) => {
    parameters[`${name}${index}`] = value;
    return `@${name}${index}`;
  });
  return `(${names.join(', ')})`;
};

const whereClause = (conditions: string[]): string =>
  conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

export const buildListActiveAlertsQuery = (input: ListActiveAlertsInput): SwqlStatement => {
  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {};

  if (input.severities) {
    const codes = input.severities.map((severity) => SOLARWINDS_SEVERITIES.indexOf(severity));
    conditions.push(`ac.Severity IN ${inList('severity', codes, parameters)}`);
  }
  if (input.acknowledged !== undefined) {
    // SWIS leaves Acknowledged null until an alert is acknowledged for the first time.
    conditions.push('ISNULL(aa.Acknowledged, false) = @acknowledged');
    parameters.acknowledged = input.acknowledged;
  }
  if (input.triggeredAfter) {
    // SWIS only parses UTC times; an offset such as +03:00 fails the SQL conversion.
    conditions.push('aa.TriggeredDateTime > @triggeredAfter');
    parameters.triggeredAfter = new Date(input.triggeredAfter).toISOString();
  }
  if (input.alertName) {
    conditions.push('ac.Name LIKE @alertName');
    parameters.alertName = contains(input.alertName);
  }
  if (input.nodeId !== undefined) {
    conditions.push('ao.RelatedNodeId = @nodeId');
    parameters.nodeId = input.nodeId;
  }

  return {
    query: `SELECT ${ALERT_COLUMNS.join(', ')} ${ALERT_FROM}${whereClause(
      conditions
    )} ORDER BY aa.TriggeredDateTime DESC ${pageClause(input.limit, input.offset)}`,
    parameters,
  };
};

export const buildGetAlertQuery = (input: GetAlertInput): SwqlStatement => {
  const [column, id] =
    input.alertActiveId !== undefined
      ? ['aa.AlertActiveID', input.alertActiveId]
      : ['aa.AlertObjectID', input.alertObjectId];
  return {
    query: `SELECT TOP 1 ${ALERT_DETAIL_COLUMNS.join(', ')} ${ALERT_FROM} WHERE ${column} = @id`,
    parameters: { id },
  };
};

export const buildAcknowledgedAlertsQuery = (alertObjectIds: readonly number[]): SwqlStatement => {
  const parameters: Record<string, unknown> = {};
  return {
    query: `SELECT aa.AlertObjectID FROM Orion.AlertActive aa WHERE aa.Acknowledged = true AND aa.AlertObjectID IN ${inList(
      'id',
      alertObjectIds,
      parameters
    )}`,
    parameters,
  };
};

export const buildGetNodeQuery = (input: GetNodeInput): SwqlStatement => {
  const [column, value] =
    input.nodeId !== undefined
      ? ['n.NodeID', input.nodeId]
      : input.ipAddress !== undefined
      ? ['n.IPAddress', input.ipAddress]
      : ['n.Caption', input.caption];
  return {
    query: `SELECT TOP 2 ${NODE_DETAIL_COLUMNS.join(
      ', '
    )} FROM Orion.Nodes n WHERE ${column} = @value`,
    parameters: { value },
  };
};

export const buildSearchNodesQuery = (input: SearchNodesInput): SwqlStatement => {
  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {};

  if (input.search) {
    conditions.push(
      '(n.Caption LIKE @search OR n.IPAddress LIKE @search OR n.DNS LIKE @search OR n.SysName LIKE @search)'
    );
    parameters.search = contains(input.search);
  }
  if (input.statuses) {
    const codes = input.statuses.map((status) => SOLARWINDS_NODE_STATUSES[status]);
    conditions.push(`n.Status IN ${inList('status', codes, parameters)}`);
  }
  if (input.vendor) {
    conditions.push('n.Vendor LIKE @vendor');
    parameters.vendor = contains(input.vendor);
  }
  if (input.machineType) {
    conditions.push('n.MachineType LIKE @machineType');
    parameters.machineType = contains(input.machineType);
  }
  if (input.customProperty) {
    conditions.push(`n.CustomProperties.${input.customProperty.name} = @customPropertyValue`);
    parameters.customPropertyValue = input.customProperty.value;
  }

  return {
    query: `SELECT ${NODE_COLUMNS.join(', ')} FROM Orion.Nodes n${whereClause(
      conditions
    )} ORDER BY n.Caption ${pageClause(input.limit, input.offset)}`,
    parameters,
  };
};
