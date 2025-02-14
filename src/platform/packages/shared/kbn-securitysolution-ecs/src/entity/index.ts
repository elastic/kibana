/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Asset Inventory - This file is a placeholder for the ECS schema that will be used in the Asset Inventory app
export interface EntityEcs {
  id: string;
  name: string;
  type: 'universal' | 'user' | 'host' | 'service';
  timestamp: Date;
}
