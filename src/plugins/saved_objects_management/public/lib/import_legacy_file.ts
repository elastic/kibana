/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export async function importLegacyFile(file: File) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = (event) => {
      const result = event.target!.result as string;
      try {
        resolve(JSON.parse(result));
      } catch (e) {
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}
