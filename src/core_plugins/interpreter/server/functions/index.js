/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { demodata } from '../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/server/demodata/index';
import { escount } from '../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/server/escount';
import { esdocs } from './esdocs/index';
import { pointseries } from '../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/server/pointseries/index';
import { server } from '../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/server/server';
import { timelion } from './timelion';
import { essql } from '../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/server/essql/index';

export const functions = [demodata, esdocs, escount, essql, pointseries, server, timelion];
