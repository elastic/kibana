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
export type { Tour } from './state/tour_queue_state';

const TOUR_REGISTRY = {
  siemMigrationSetupTour: 1,
} as const;

/**
 * Valid tour IDs for registering tours in the queue.
 * Tours are shown in order based on their registry value.
 * @public
 */
export const TOURS = {
  SECURITY_SIEM_MIGRATION: 'siemMigrationSetupTour',
} as const;

/**
 * Union type of all available tour IDs
 * @public
 */
export type TourId = (typeof TOURS)[keyof typeof TOURS];

/**
 * Get the display order for a tour. Lower numbers are shown first.
 * @param tourId - The tour ID
 * @returns The numeric order value for the tour
 * @internal
 */
export const getOrder = (tourId: TourId): number => {
  return TOUR_REGISTRY[tourId];
};
