/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const ShadowingFieldWarning = () => {
  return (
    <KbnWarningCallout
      title={i18n.translate('indexPatternFieldEditor.editor.form.fieldShadowingCalloutTitle', {
        defaultMessage: 'Field shadowing',
      })}
      text={i18n.translate('indexPatternFieldEditor.editor.form.fieldShadowingCalloutDescription', {
        defaultMessage:
          'This field shares the name of a mapped field. Values for this field will be returned in search results.',
      })}
      size="s"
      data-test-subj="shadowingFieldCallout"
    />
  );
};
