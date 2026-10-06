/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildGetAlertQuery,
  buildGetNodeQuery,
  buildListActiveAlertsQuery,
  buildSearchNodesQuery,
} from './queries';

describe('buildListActiveAlertsQuery', () => {
  it('pages with WITH ROWS and asks for the total row count', () => {
    const { query, parameters } = buildListActiveAlertsQuery({ limit: 25, offset: 50 });

    expect(query).toMatch(/ORDER BY aa\.TriggeredDateTime DESC WITH ROWS 51 TO 75 WITH TOTALROWS$/);
    expect(query).not.toContain('WHERE');
    expect(parameters).toEqual({});
  });

  it('passes every filter as a parameter', () => {
    const { query, parameters } = buildListActiveAlertsQuery({
      severities: ['critical', 'warning'],
      acknowledged: false,
      triggeredAfter: '2026-10-05T11:00:00+03:00',
      alertName: 'Node is down',
      nodeId: 7,
      limit: 50,
      offset: 0,
    });

    expect(query).toContain(
      'WHERE ac.Severity IN (@severity0, @severity1) AND ISNULL(aa.Acknowledged, false) = @acknowledged AND aa.TriggeredDateTime > @triggeredAfter AND ac.Name LIKE @alertName AND ao.RelatedNodeId = @nodeId'
    );
    expect(parameters).toEqual({
      severity0: 2,
      severity1: 1,
      acknowledged: false,
      triggeredAfter: '2026-10-05T08:00:00.000Z',
      alertName: '%Node is down%',
      nodeId: 7,
    });
  });
});

describe('buildGetAlertQuery', () => {
  it.each([
    [{ alertActiveId: 10 }, 'aa.AlertActiveID = @id', 10],
    [{ alertObjectId: 20 }, 'aa.AlertObjectID = @id', 20],
  ])('filters %j by the given ID', (input, condition, id) => {
    const { query, parameters } = buildGetAlertQuery(input);

    expect(query).toContain(condition);
    expect(query).toContain('ao.AlertNote');
    expect(parameters).toEqual({ id });
  });
});

describe('buildGetNodeQuery', () => {
  it.each([
    [{ nodeId: 7 }, 'n.NodeID = @value', 7],
    [{ ipAddress: '10.0.0.1' }, 'n.IPAddress = @value', '10.0.0.1'],
    [{ caption: 'core-sw-01' }, 'n.Caption = @value', 'core-sw-01'],
  ])('filters %j on the matching column', (input, condition, value) => {
    const { query, parameters } = buildGetNodeQuery(input);

    expect(query).toContain(condition);
    expect(parameters).toEqual({ value });
  });

  it('never selects the SNMP community strings', () => {
    const { query } = buildGetNodeQuery({ nodeId: 7 });

    expect(query).not.toMatch(/Community/i);
  });
});

describe('buildSearchNodesQuery', () => {
  it('passes every filter as a parameter', () => {
    const { query, parameters } = buildSearchNodesQuery({
      search: 'core',
      statuses: ['down', 'unreachable'],
      vendor: 'Cisco',
      machineType: 'Catalyst',
      customProperty: { name: 'Site', value: 'Abu Dhabi' },
      limit: 10,
      offset: 0,
    });

    expect(query).toContain('n.Status IN (@status0, @status1)');
    expect(query).toContain('n.CustomProperties.Site = @customPropertyValue');
    expect(query).toMatch(/ORDER BY n\.Caption WITH ROWS 1 TO 10 WITH TOTALROWS$/);
    expect(query).not.toMatch(/Community/i);
    expect(parameters).toEqual({
      search: '%core%',
      status0: 2,
      status1: 12,
      vendor: '%Cisco%',
      machineType: '%Catalyst%',
      customPropertyValue: 'Abu Dhabi',
    });
  });
});
