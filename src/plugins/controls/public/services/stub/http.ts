/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpResponse } from '../../../../../core/public';
import { PluginServiceFactory } from '../../../../presentation_util/public';
import { ControlsHTTPService } from '../http';

type HttpServiceFactory = PluginServiceFactory<ControlsHTTPService>;

export const httpServiceFactory: HttpServiceFactory = () => ({
  fetch: async () => ({} as unknown as HttpResponse),
});
