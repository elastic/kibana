/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const DRIVE_URL_FILE_ID_PATTERNS = [
  /https?:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation|file)\/d\/([a-zA-Z0-9_-]+)/g,
  /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/g,
  /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/g,
];

export interface ParsedDriveUrlLink {
  fileId: string;
  url: string;
}

export function parseDriveUrlsFromText(text: string): ParsedDriveUrlLink[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const linksById = new Map<string, ParsedDriveUrlLink>();

  for (const pattern of DRIVE_URL_FILE_ID_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const fileId = match[1];
      const url = match[0];
      if (fileId && url && !linksById.has(fileId)) {
        linksById.set(fileId, { fileId, url });
      }
    }
  }

  return [...linksById.values()];
}

export function parseCommaSeparatedIds(value: string): string[] {
  if (!value || value.trim().length === 0) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
