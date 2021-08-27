/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { TextField } from '../../../../../es_ui_shared/static/forms/components/fields/text_field';
import { UseField } from '../../../../../es_ui_shared/static/forms/hook_form_lib/components/use_field';

export const CustomLabelField = () => {
  return <UseField path="customLabel" component={TextField} />;
};
