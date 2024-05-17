/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';

import { DataViewField } from '@kbn/data-views-plugin/public';
import { AggParamEditorProps } from '../agg_param_props';
import { FieldParamEditor } from './field';

function TopSortFieldParamEditor(props: AggParamEditorProps<DataViewField>) {
  const customLabel = i18n.translate('visDefaultEditor.controls.sortOnLabel', {
    defaultMessage: 'Sort on',
  });

  return <FieldParamEditor {...props} customLabel={customLabel} />;
}

export { TopSortFieldParamEditor };
