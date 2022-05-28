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
import { AggParamEditorProps } from '../agg_param_props';

function TopSortFieldParamEditor(props: AggParamEditorProps<IndexPatternField>) {
  const customLabel = i18n.translate('visDefaultEditor.controls.sortOnLabel', {
    defaultMessage: 'Sort on',
  });

  return <FieldParamEditor {...props} customLabel={customLabel} />;
}

export { TopSortFieldParamEditor };
