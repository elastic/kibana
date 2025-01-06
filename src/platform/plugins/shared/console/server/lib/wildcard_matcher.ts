/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Minimatch, IMinimatch } from 'minimatch';

export class WildcardMatcher {
  pattern: string;
  matcher: IMinimatch;

  constructor(private readonly wildcardPattern: string, private readonly emptyVal?: string) {
    this.pattern = String(this.wildcardPattern || '*');
    this.matcher = new Minimatch(this.pattern, {
      noglobstar: true,
      dot: true,
      nocase: true,
      matchBase: true,
      nocomment: true,
    });
  }

  match(candidate: string) {
    const empty = !candidate || candidate === this.emptyVal;
    if (empty && this.pattern === '*') {
      return true;
    }

    return this.matcher.match(candidate || '');
  }
}
