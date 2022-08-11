/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { search } from '@kbn/data-plugin/public';
import { SwitchParamEditor } from './switch';

import { AggParamEditorProps } from '../agg_param_props';

function MissingBucketParamEditor(props: AggParamEditorProps<boolean>) {
  const fieldTypeIsNotString = !search.aggs.isStringType(props.agg);
  const { setValue } = props;

  useEffect(() => {
    if (fieldTypeIsNotString) {
      setValue(false);
    }
  }, [fieldTypeIsNotString, setValue]);

  return (
    <SwitchParamEditor
      {...props}
      dataTestSubj="missingBucketSwitch"
      displayLabel={i18n.translate('visDefaultEditor.controls.otherBucket.showMissingValuesLabel', {
        defaultMessage: 'Show missing values',
      })}
      displayToolTip={i18n.translate(
        'visDefaultEditor.controls.otherBucket.showMissingValuesTooltip',
        {
          defaultMessage:
            'Only works for fields of type "string". When enabled, include documents with missing ' +
            'values in the search. If this bucket is in the top N, it appears in the chart. ' +
            'If not in the top N, and you enable "Group other values in separate bucket", ' +
            'Elasticsearch adds the missing values to the "other" bucket.',
        }
      )}
      disabled={fieldTypeIsNotString}
    />
  );
}

export { MissingBucketParamEditor };
