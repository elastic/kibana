/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type PocToastType = 'info' | 'warning' | 'error';

export interface PocToastCta {
  readonly label: string;
}

export interface PocToastInput {
  readonly type: PocToastType;
  readonly title: string;
  readonly text?: string;
  readonly cta?: PocToastCta;
}

export interface PocToast extends PocToastInput {
  readonly id: string;
}
