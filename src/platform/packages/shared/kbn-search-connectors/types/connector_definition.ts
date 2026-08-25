/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ConnectorClientSideDefinition {
  docsUrl?: string;
  externalAuthDocsUrl?: string;
  externalDocsUrl: string;
  platinumOnly?: boolean;
}

export interface ConnectorServerSideDefinition {
  categories?: string[];
  description?: string;
  iconPath: string;
  isBeta: boolean;
  isNative: boolean;
  isTechPreview?: boolean;
  keywords: string[];
  name: string;
  serviceType: string;
}

export type ConnectorDefinition = ConnectorClientSideDefinition & ConnectorServerSideDefinition;
