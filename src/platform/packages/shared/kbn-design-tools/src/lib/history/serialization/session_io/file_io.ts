/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExportedState } from './types';

/**
 * Trigger a JSON file download in the browser.
 *
 * @param data - The object to serialize.
 * @param filename - The download filename.
 */
export const downloadAsJsonFile = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revocation so the browser can finish initiating the download.
  // Use a generous timeout to account for slow disk I/O and large files.
  const timer = setTimeout(() => URL.revokeObjectURL(url), 60_000);
  // If the page unloads before the timer fires, revoke immediately to
  // prevent the blob from leaking across navigations.
  const cleanup = () => {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  };
  window.addEventListener('unload', cleanup, { once: true });
};

/**
 * Open a file picker and read a JSON file. Returns `null` if the user
 * cancels or the file can't be parsed.
 *
 * @returns The parsed export payload, or `null`.
 */
export const pickJsonFile = (): Promise<ExportedState | null> =>
  new Promise((resolve) => {
    let settled = false;
    const settle = (value: ExportedState | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('cancel', () => settle(null));
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        settle(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as ExportedState;
          // The lack of schema validation is intentional - this is a developer tool and we want to be forgiving of missing/extra fields as the format evolves. Just check the basics to avoid runtime errors during import.
          if (
            parsed.version !== 1 ||
            !Array.isArray(parsed.sessions) ||
            typeof parsed.pageUrl !== 'string'
          ) {
            settle(null);
            return;
          }
          settle(parsed);
        } catch {
          settle(null);
        }
      };
      reader.onerror = () => settle(null);
      reader.readAsText(file);
    });
    input.click();
  });
