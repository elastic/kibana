/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

import { SavedObjectsClient } from './saved_objects_client';

export class Request extends Hapi.Request {
  public getSavedObjectsClient(): SavedObjectsClient;
}
