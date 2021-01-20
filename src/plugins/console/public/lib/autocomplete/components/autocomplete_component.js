/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export class AutocompleteComponent {
  constructor(name) {
    this.name = name;
  }
  /** called to get the possible suggestions for tokens, when this object is at the end of
   * the resolving chain (and thus can suggest possible continuation paths)
   */
  getTerms() {
    return [];
  }
  /*
 if the current matcher matches this term, this method should return an object with the following keys
 {
 context_values: {
 values extract from term that should be added to the context
 }
 next: AutocompleteComponent(s) to use next
 priority: optional priority to solve collisions between multiple paths. Min value is used across entire chain
 }
 */
  match() {
    return {
      next: this.next,
    };
  }
}
