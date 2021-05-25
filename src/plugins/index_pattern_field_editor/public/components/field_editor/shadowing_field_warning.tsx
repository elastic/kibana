/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

export const ShadowingFieldWarning = () => {
  return (
    <EuiCallOut
      title={i18n.translate('indexPatternFieldEditor.editor.form.fieldShadowingCalloutTitle', {
        defaultMessage: 'Field shadowing',
      })}
      color="warning"
      iconType="pin"
      size="s"
      data-test-subj="shadowingFieldCallout"
    >
      <div>
        {i18n.translate('indexPatternFieldEditor.editor.form.fieldShadowingCalloutDescription', {
          defaultMessage:
            'This field shares the name of a mapped field. Values for this field will be returned in search results.',
        })}
      </div>
    </EuiCallOut>
  );
};
