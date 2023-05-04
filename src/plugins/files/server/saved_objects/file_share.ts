/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFieldMapping, SavedObjectsType } from '@kbn/core/server';
import type { FileShare } from '../../common/types';
import { FILE_SHARE_SO_TYPE } from '../../common/constants';

/**
 * This saved object represents an instance of a publicly shared file.
 *
 * This file should be accessible to anyone who can access this Kibana over the
 * Internet.
 */

type Properties = Pick<Record<keyof FileShare, SavedObjectsFieldMapping>, 'created' | 'token'>;

const properties: Properties = {
  created: {
    type: 'date',
  },
  token: {
    type: 'keyword',
  },
};

export const fileShareObjectType: SavedObjectsType<FileShare> = {
  name: FILE_SHARE_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic', // These saved objects should be visible everywhere
  mappings: {
    dynamic: false,
    properties,
  },
};
