/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { IndexPatternField } from '@kbn/data-plugin/public';
import { FieldParamEditor } from './field';
import { getCompatibleAggs } from './top_aggregate';
import { AggParamEditorProps } from '../agg_param_props';

function TopFieldParamEditor(props: AggParamEditorProps<IndexPatternField>) {
  const compatibleAggs = getCompatibleAggs(props.agg);
  let customError;

  if (props.value && !compatibleAggs.length) {
    customError = i18n.translate('visDefaultEditor.controls.aggregateWith.noAggsErrorTooltip', {
      defaultMessage: 'The chosen field has no compatible aggregations.',
    });
  }

  return <FieldParamEditor {...props} customError={customError} />;
}

export { TopFieldParamEditor };
