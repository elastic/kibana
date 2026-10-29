/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type DataManagementPrototypeVariant = 'v1' | 'v2';

const STORAGE_KEY = 'dataManagementOverview.prototypeVariant';
const VARIANT_EVENT = 'dataManagementOverview:prototypeVariant';

const isVariant = (value: unknown): value is DataManagementPrototypeVariant =>
  value === 'v1' || value === 'v2';

/** Selected data management overview prototype. Defaults to v1. */
export const getDataManagementPrototypeVariant = (): DataManagementPrototypeVariant => {
  if (typeof sessionStorage === 'undefined') {
    return 'v1';
  }
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return isVariant(stored) ? stored : 'v1';
};

/** Persist the overview prototype and notify listeners in this tab. */
export const setDataManagementPrototypeVariant = (
  variant: DataManagementPrototypeVariant
): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, variant);
  window.dispatchEvent(new CustomEvent(VARIANT_EVENT, { detail: variant }));
};

/** Subscribe to prototype changes made in this tab. */
export const subscribeDataManagementPrototypeVariant = (
  listener: (variant: DataManagementPrototypeVariant) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const onVariant = (event: Event) => {
    const detail = (event as CustomEvent<unknown>).detail;
    listener(isVariant(detail) ? detail : 'v1');
  };
  window.addEventListener(VARIANT_EVENT, onVariant);
  return () => window.removeEventListener(VARIANT_EVENT, onVariant);
};
