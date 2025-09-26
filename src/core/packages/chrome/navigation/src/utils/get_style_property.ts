/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Utility function to get the value of a style property of an element.
 *
 * @param element - The element to get the property value of.
 * @param property - The property to get the value of.
 * @returns The value of the property.
 */
export const getStyleProperty = (element: HTMLElement, property: string): number => {
  if (typeof window === 'undefined') return 0;

  const styles = window.getComputedStyle(element);
  const propertyValue = styles.getPropertyValue(property);

  return parseFloat(propertyValue);
};
