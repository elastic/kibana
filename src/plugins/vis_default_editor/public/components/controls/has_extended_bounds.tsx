/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import { search } from '@kbn/data-plugin/public';
import { SwitchParamEditor } from './switch';
import { AggParamEditorProps } from '../agg_param_props';

const { isType } = search.aggs;

function HasExtendedBoundsParamEditor(props: AggParamEditorProps<boolean>) {
  const { agg, setValue, value } = props;
  const minDocCount = useRef(agg.params.min_doc_count);

  useEffect(() => {
    if (minDocCount.current !== agg.params.min_doc_count) {
      // The "Extend bounds" param is only enabled when "Show empty buckets" is turned on.
      // So if "Show empty buckets" is changed, "Extend bounds" should reflect changes
      minDocCount.current = agg.params.min_doc_count;

      setValue(value && agg.params.min_doc_count);
    }
  }, [agg.params.min_doc_count, setValue, value]);

  return (
    <SwitchParamEditor
      {...props}
      displayLabel={i18n.translate('visDefaultEditor.controls.extendedBoundsLabel', {
        defaultMessage: 'Extend bounds',
      })}
      displayToolTip={i18n.translate('visDefaultEditor.controls.extendedBoundsTooltip', {
        defaultMessage:
          'Min and Max do not filter the results, but rather extend the bounds of the result set.',
      })}
      disabled={
        !props.agg.params.min_doc_count ||
        !(isType('number')(props.agg) || isType('date')(props.agg))
      }
    />
  );
}

export { HasExtendedBoundsParamEditor };
