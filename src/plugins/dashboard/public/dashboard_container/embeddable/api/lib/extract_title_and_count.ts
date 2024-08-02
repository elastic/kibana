/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const extractTitleAndCount = (title: string): [string, number] => {
  if (title.slice(-1) === ')') {
    const startIndex = title.lastIndexOf(' (');
    const count = title.substring(startIndex + 2, title.lastIndexOf(')'));
    if (!count.includes('.') && Number.isInteger(Number(count)) && Number(count) >= 1) {
      const baseTitle = title.substring(0, startIndex);
      return [baseTitle, Number(count)];
    }
  }
  return [title, 0];
};
