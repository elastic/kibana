/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps real, potentially sensitive identifiers to stable synthetic values so the
 * same input always yields the same anonymized output within a single run, while
 * preserving distinctness (two different real names map to two different fakes).
 */
export class Scrubber {
  private readonly categories = new Map<string, Map<string, string>>();

  label(category: string, value: string): string {
    let values = this.categories.get(category);
    if (!values) {
      values = new Map<string, string>();
      this.categories.set(category, values);
    }
    if (!values.has(value)) {
      values.set(value, `${category}-${values.size + 1}`);
    }
    return values.get(value)!;
  }
}
