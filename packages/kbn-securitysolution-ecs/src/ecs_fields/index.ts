/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extendMap } from './extend_map';

export const cloudFieldsMap: Readonly<Record<string, string>> = {
  'cloud.account.id': 'cloud.account.id',
  'cloud.availability_zone': 'cloud.availability_zone',
  'cloud.instance.id': 'cloud.instance.id',
  'cloud.instance.name': 'cloud.instance.name',
  'cloud.machine.type': 'cloud.machine.type',
  'cloud.provider': 'cloud.provider',
  'cloud.region': 'cloud.region',
};

export const osFieldsMap: Readonly<Record<string, string>> = {
  'os.platform': 'os.platform',
  'os.name': 'os.name',
  'os.full': 'os.full',
  'os.family': 'os.family',
  'os.version': 'os.version',
  'os.kernel': 'os.kernel',
};

export const hostFieldsMap: Readonly<Record<string, string>> = {
  'host.architecture': 'host.architecture',
  'host.id': 'host.id',
  'host.ip': 'host.ip',
  'host.mac': 'host.mac',
  'host.name': 'host.name',
  ...extendMap('host', osFieldsMap),
};

export const processFieldsMap: Readonly<Record<string, string>> = {
  'process.hash.md5': 'process.hash.md5',
  'process.hash.sha1': 'process.hash.sha1',
  'process.hash.sha256': 'process.hash.sha256',
  'process.pid': 'process.pid',
  'process.name': 'process.name',
  'process.ppid': 'process.ppid',
  'process.args': 'process.args',
  'process.entity_id': 'process.entity_id',
  'process.executable': 'process.executable',
  'process.title': 'process.title',
  'process.thread': 'process.thread',
  'process.working_directory': 'process.working_directory',
};

export const userFieldsMap: Readonly<Record<string, string>> = {
  'user.domain': 'user.domain',
  'user.id': 'user.id',
  'user.name': 'user.name',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.full_name': 'user.full_name',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.email': 'user.email',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.hash': 'user.hash',
  // NOTE: This field is not tested and available from ECS. Please remove this tag once it is
  'user.group': 'user.group',
};

export const sourceFieldsMap: Readonly<Record<string, string>> = {
  'source.bytes': 'source.bytes',
  'source.ip': 'source.ip',
  'source.packets': 'source.packets',
  'source.port': 'source.port',
  'source.domain': 'source.domain',
  'source.geo.continent_name': 'source.geo.continent_name',
  'source.geo.country_name': 'source.geo.country_name',
  'source.geo.country_iso_code': 'source.geo.country_iso_code',
  'source.geo.city_name': 'source.geo.city_name',
  'source.geo.region_iso_code': 'source.geo.region_iso_code',
  'source.geo.region_name': 'source.geo.region_name',
};
