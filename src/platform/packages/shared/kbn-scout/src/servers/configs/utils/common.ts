/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import getopts from 'getopts';
import type { ServerlessProjectType } from '@kbn/es';

export const formatCurrentDate = () => {
  const now = new Date();

  const format = (num: number, length: number) => String(num).padStart(length, '0');

  return (
    `${format(now.getDate(), 2)}/${format(now.getMonth() + 1, 2)}/${now.getFullYear()} ` +
    `${format(now.getHours(), 2)}:${format(now.getMinutes(), 2)}:${format(now.getSeconds(), 2)}.` +
    `${format(now.getMilliseconds(), 3)}`
  );
};

export const getProjectType = (kbnServerArgs: string[]) => {
  const options = getopts(kbnServerArgs);
  return options.serverless as ServerlessProjectType;
};

export const getOrganizationId = (kbnServerArgs: string[]) => {
  return getopts(kbnServerArgs)['xpack.cloud.organization_id'] as string | undefined;
};
