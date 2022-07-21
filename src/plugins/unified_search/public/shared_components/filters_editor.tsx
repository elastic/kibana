/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataView } from '@kbn/data-views-plugin/common';


export interface filtersEditorProps {
  saveFilters: () => void,
  dataViews: DataView,
}

export function FiltersEditor({
  saveFilters,
  dataViews,
}: filtersEditorProps) {

  return (<></>);
};
