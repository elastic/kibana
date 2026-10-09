/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Set a CSS property with `!important` priority.
 *
 * @param el - The target element.
 * @param prop - The CSS property name.
 * @param value - The CSS value to set.
 */
export const setImportant = (el: HTMLElement, prop: string, value: string): void => {
  el.style.setProperty(prop, value, 'important');
};
