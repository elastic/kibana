/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export async function extractExportDetails(
  blob: Blob
): Promise<SavedObjectsExportResultDetails | undefined> {
  const reader = new FileReader();
  const content = await new Promise<string>((resolve, reject) => {
    reader.addEventListener('loadend', (e) => {
      resolve((e as any).target.result);
    });
    reader.addEventListener('error', (e) => {
      reject(e);
    });
    reader.readAsText(blob, 'utf-8');
  });
  const lines = content.split('\n').filter((l) => l.length > 0);
  const maybeDetails = JSON.parse(lines[lines.length - 1]);
  if (isExportDetails(maybeDetails)) {
    return maybeDetails;
  }
}

export interface SavedObjectsExportResultDetails {
  exportedCount: number;
  missingRefCount: number;
  missingReferences: Array<{
    id: string;
    type: string;
  }>;
  excludedObjectsCount: number;
  excludedObjects: Array<{
    id: string;
    type: string;
    reason?: string;
  }>;
}

function isExportDetails(object: any): object is SavedObjectsExportResultDetails {
  return 'exportedCount' in object && 'missingRefCount' in object && 'missingReferences' in object;
}
