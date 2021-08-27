/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NumericField } from '../../../../../es_ui_shared/static/forms/components/fields/numeric_field';
import { UseField } from '../../../../../es_ui_shared/static/forms/hook_form_lib/components/use_field';

export const PopularityField = () => {
  return (
    <UseField
      path="popularity"
      component={NumericField}
      componentProps={{ euiFieldProps: { 'data-test-subj': 'editorFieldCount' } }}
    />
  );
};
