/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FeaturesRegistry } from '@kbn/discover-utils';
import { DiscoverFeature } from './types';

const registry = new FeaturesRegistry<DiscoverFeature>();

export const createDiscoverFeaturesServiceSetupMock = () => ({ registry });
export const createDiscoverFeaturesServiceStartMock = () => ({ registry });
