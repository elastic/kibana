/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { pkg } from '../../core/server/utils';
export const IS_KIBANA_DISTRIBUTABLE = pkg.build && pkg.build.distributable === true;
export const IS_KIBANA_RELEASE = pkg.build && pkg.build.release === true;
