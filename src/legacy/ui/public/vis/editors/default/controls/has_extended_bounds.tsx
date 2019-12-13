/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { SwitchParamEditor } from './switch';
import { isType } from '../../../../agg_types/buckets/migrate_include_exclude_format';
import { AggParamEditorProps } from '..';

function HasExtendedBoundsParamEditor(props: AggParamEditorProps<boolean>) {
  useEffect(() => {
    props.setValue(props.value && props.agg.params.min_doc_count);
  }, [props.agg.params.min_doc_count]);

  return (
    <SwitchParamEditor
      displayLabel={i18n.translate('data.search.aggs.extendedBoundsLabel', {
        defaultMessage: 'Extend bounds',
      })}
      displayToolTip={i18n.translate('data.search.aggs.extendedBoundsTooltip', {
        defaultMessage:
          'Min and Max do not filter the results, but rather extend the bounds of the result set.',
      })}
      disabled={
        !props.agg.params.min_doc_count ||
        !(isType('number')(props.agg) || isType('date')(props.agg))
      }
      {...props}
    />
  );
}

export { HasExtendedBoundsParamEditor };
