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

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SizeParamEditor } from './size';
import { getCompatibleAggs } from './top_aggregate';
import { AggParamEditorProps } from '..';

function TopSizeParamEditor(props: AggParamEditorProps<number | ''>) {
  const iconTip = (
    <>
      {' '}
      <EuiIconTip
        position="right"
        content={i18n.translate('data.search.aggs.sizeTooltip', {
          defaultMessage:
            "Request top-K hits. Multiple hits will be combined via 'aggregate with'.",
        })}
        type="questionInCircle"
      />
    </>
  );
  const fieldType = props.agg.params.field && props.agg.params.field.type;
  const disabled = fieldType && !getCompatibleAggs(props.agg).length;

  return <SizeParamEditor {...props} iconTip={iconTip} disabled={disabled} />;
}

export { TopSizeParamEditor };
