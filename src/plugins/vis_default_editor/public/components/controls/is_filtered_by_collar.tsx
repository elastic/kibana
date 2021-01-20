/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SwitchParamEditor } from './switch';
import { AggParamEditorProps } from '../agg_param_props';

function IsFilteredByCollarParamEditor(props: AggParamEditorProps<boolean>) {
  return (
    <SwitchParamEditor
      displayLabel={i18n.translate(
        'visDefaultEditor.controls.onlyRequestDataAroundMapExtentLabel',
        {
          defaultMessage: 'Only request data around map extent',
        }
      )}
      displayToolTip={i18n.translate(
        'visDefaultEditor.controls.onlyRequestDataAroundMapExtentTooltip',
        {
          defaultMessage:
            'Apply geo_bounding_box filter aggregation to narrow the subject area to the map view box with collar',
        }
      )}
      dataTestSubj="isFilteredByCollarCheckbox"
      {...props}
    />
  );
}

export { IsFilteredByCollarParamEditor };
