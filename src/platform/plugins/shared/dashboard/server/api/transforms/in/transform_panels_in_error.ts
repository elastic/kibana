/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

export class TransformPanelsInError extends Error {
  public readonly panelErrors: TransformPanelInError[];

  constructor(message: string, panelErrors: TransformPanelInError[]) {
    super(message);
    this.name = 'TransformPanelsInError';
    this.panelErrors = panelErrors;
  }
}

export class TransformPanelInError extends Error {
  public readonly type: string;
  public readonly config: object;

  constructor(message: string, type: string, config: object) {
    super(message);
    this.name = 'TransformPanelInError';
    this.type = type;
    this.config = config;
  }
}
