/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface GetFileInput {
  fileKey: string;
  nodeIds?: string;
  depth?: number;
}

export interface RenderNodesInput {
  fileKey: string;
  nodeIds: string;
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
  scale?: number;
}

export interface ListProjectFilesInput {
  projectId: string;
}

export interface ListTeamProjectsInput {
  teamId: string;
}

export interface ParseFigmaUrlInput {
  url: string;
}

export interface ParseFigmaUrlResult {
  fileKey?: string;
  teamId?: string;
  nodeId?: string;
  /** Present when the URL could not be parsed or did not match a Figma file/team URL */
  error?: string;
  /** Machine-readable code for the kind of failure */
  code?: 'INVALID_URL' | 'NOT_FIGMA' | 'NO_MATCH';
}

export interface WhoAmIResult {
  id?: string;
  handle?: string;
  email?: string;
  img_url?: string;
}
