/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A search that can be cancelled has to settle before another one starts, so the Cancel button
 * replaces Submit and the controls that would start a new search are locked, for as long as it
 * is loading. Views without a cancel handler keep Submit available, so they are never locked.
 */
export const isSearchLocked = ({
  isLoading,
  onCancel,
}: {
  isLoading?: boolean;
  onCancel?: () => void;
}): boolean => Boolean(isLoading && onCancel);
