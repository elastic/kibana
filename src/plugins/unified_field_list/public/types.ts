/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

<<<<<<< HEAD:src/plugins/controls/common/time_slider/types.ts
import type { ControlInput } from '../types';

export const TIME_SLIDER_CONTROL = 'timeSlider';

export interface TimeSliderControlEmbeddableInput extends ControlInput {
  value?: [number, number];
}
=======
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnifiedFieldListPluginStart {}
>>>>>>> 98ec1559e79d6f951d8d61e9f6a62499cd560fc2:src/plugins/unified_field_list/public/types.ts
