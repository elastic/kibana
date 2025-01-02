/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  apiPublishesPanelDescription,
  apiPublishesPanelTitle,
  apiPublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import { LinksParentApi } from '../types';

export const isParentApiCompatible = (parentApi: unknown): parentApi is LinksParentApi =>
  apiIsPresentationContainer(parentApi) &&
  apiPublishesSavedObjectId(parentApi) &&
  apiPublishesPanelTitle(parentApi) &&
  apiPublishesPanelDescription(parentApi);
