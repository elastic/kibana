/*
* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
* or more contributor license agreements. Licensed under the Elastic License
* 2.0 and the Server Side Public License, v 1; you may not use this file except
* in compliance with, at your election, the Elastic License 2.0 or the Server
* Side Public License, v 1.
*/

/* eslint-disable */
export const interfaceEcs = {
  alias: {
    dashed_name: 'interface-alias',
    description: 'Interface alias as reported by the system, typically used in firewall implementations for e.g. inside, outside, or dmz logical interface naming.',
    example: 'outside',
    flat_name: 'interface.alias',
    ignore_above: 1024,
    level: 'extended',
    name: 'alias',
    normalize: [],
    short: 'Interface alias',
    type: 'keyword'
  },
  id: {
    dashed_name: 'interface-id',
    description: 'Interface ID as reported by an observer (typically SNMP interface ID).',
    example: 10,
    flat_name: 'interface.id',
    ignore_above: 1024,
    level: 'extended',
    name: 'id',
    normalize: [],
    short: 'Interface ID',
    type: 'keyword'
  },
  name: {
    dashed_name: 'interface-name',
    description: 'Interface name as reported by the system.',
    example: 'eth0',
    flat_name: 'interface.name',
    ignore_above: 1024,
    level: 'extended',
    name: 'name',
    normalize: [],
    short: 'Interface name',
    type: 'keyword'
  }
}