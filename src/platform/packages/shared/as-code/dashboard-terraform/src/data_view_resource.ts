/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from './convert_dashboard';

/** The saved data view attributes the provider's `data_view` block is mapped from. */
export interface SavedDataView {
  title: string;
  name?: string;
  timeFieldName?: string;
}

// Mapped by hand, not by annotation (ADR 0003): the provider's `data_view` block mirrors the saved data view.
/** The body of an `elasticstack_kibana_data_view` resource; it pins no ID and no spaces. */
export const toDataViewResourceBody = ({
  title,
  name,
  timeFieldName,
}: SavedDataView): JsonObject => ({
  data_view: {
    title,
    ...(name && { name }),
    ...(timeFieldName && { time_field_name: timeFieldName }),
  },
});
