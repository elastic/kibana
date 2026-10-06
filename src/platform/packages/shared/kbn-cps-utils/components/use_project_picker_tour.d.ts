/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * TODO: Once this tour is removed, update the test to no longer dismiss it.
 * See {@link ThreatMatchRuleCreatePage.dismissCpsTourIfPresent}.
 */
export declare const TOUR_STORAGE_KEY = 'cps:projectPicker:tourShown';
export declare const useProjectPickerTour: () => {
  isTourOpen: boolean;
  closeTour: () => void;
};
