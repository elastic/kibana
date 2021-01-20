/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';

import { AggParamEditorProps } from '../agg_param_props';
import { RangesParamEditor } from './ranges';

export const RangesControl = (props: AggParamEditorProps<any>) => (
  <RangesParamEditor value={props.value} setValue={props.setValue} />
);
