/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This is being used by Cases in
 * x-pack/plugins/cases/common/types/domain/case/v1.ts.
 * Introducing a breaking change in this enum will
 * force cases to create a version of the domain object
 * which in turn will force cases to create a new version
 * to most of the Cases APIs.
 */
export enum CaseStatuses {
  open = 'open',
  'in-progress' = 'in-progress',
  closed = 'closed',
}
