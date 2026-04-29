/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LicenseType } from '@kbn/licensing-types';

export interface LanguageDocumentationSections {
  groups: DocumentationGroup[];
  initialSection: JSX.Element;
}
export interface DocumentationGroup {
  label: string;
  description?: string;
  items: DocumentationGroupItem[];
}

export interface DocumentationGroupItem {
  label: string;
  description: { markdownContent: string; openLinksInNewTab?: boolean };
}

export interface Signature {
  params: Array<{
    name: string;
    type: string;
    optional?: boolean;
    supportsWildcard?: boolean;
  }>;
  license?: LicenseType;
}

export interface CommandDefinition {
  name: string;
  observability_tier?: string;
  license?: LicenseType;
}

export interface FunctionDefinition {
  name: string;
  snapshot_only: boolean;
  type: string;
  titleName: string;
  operator: string;
  preview: boolean;
  signatures: Signature[];
  license?: LicenseType;
}

export interface LicenseInfo {
  name: LicenseType;
  isSignatureSpecific?: boolean;
  paramsWithLicense?: string[];
}

export interface MultipleLicenseInfo {
  licenses: LicenseInfo[];
  hasMultipleLicenses: boolean;
}
