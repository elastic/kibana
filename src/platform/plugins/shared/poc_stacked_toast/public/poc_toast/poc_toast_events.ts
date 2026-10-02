/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PocToastInput } from './poc_toast_types';

export const POC_STACKED_TOAST_ADD_EVENT = 'poc-stacked-toast:add';
export const POC_STACKED_TOAST_CTA_EVENT = 'poc-stacked-toast:cta';

export const dispatchPocStackedToastAdd = (input: PocToastInput) => {
  window.dispatchEvent(
    new CustomEvent<PocToastInput>(POC_STACKED_TOAST_ADD_EVENT, { detail: input })
  );
};
