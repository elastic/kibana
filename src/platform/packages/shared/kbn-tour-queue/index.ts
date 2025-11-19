/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { useTourQueue } from './hooks/use_tour_queue';
export { getTourQueue } from './state/registry';
export type { TourQueueResult } from './hooks/use_tour_queue';

const TOUR_REGISTRY = {
  solutionNavigationTour: 1,
  siemMigrationSetupTour: 2,
} as const;

export const TOURS = {
  NAVIGATION: 'solutionNavigationTour',
  SECURITY_SIEM_MIGRATION: 'siemMigrationSetupTour',
} as const;

export type TourId = (typeof TOURS)[keyof typeof TOURS];

export const getOrder = (tourId: TourId): number => {
  return TOUR_REGISTRY[tourId];
};
