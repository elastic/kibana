/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const Header = () => (
  <>
    <EuiText size="s">
      <p>
        <FormattedMessage
          id="indexPatternManagement.editIndexPattern.sourceLabel"
          defaultMessage="Field filters can be used to exclude one or more fields when fetching a document. This happens when
          viewing a document in the Discover app, or with a table displaying results from a saved search in the Dashboard app.
          If you have documents with large or unimportant fields you may benefit from filtering those out at this lower level."
        />
      </p>
      <p>
        <FormattedMessage
          id="indexPatternManagement.editIndexPattern.source.noteLabel"
          defaultMessage="Note that multi-fields will incorrectly appear as matches in the table below. These filters only actually apply
          to fields in the original source document, so matching multi-fields are not actually being filtered."
        />
      </p>
    </EuiText>
    <EuiSpacer size="s" />
  </>
);
