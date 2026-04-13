/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { WORKFLOWS_DOCUMENTATION_URL } from '../../../../common';

export function DocumentationLink() {
  return (
    <EuiButtonEmpty
      size="s"
      href={WORKFLOWS_DOCUMENTATION_URL}
      target="_blank"
      iconType="popout"
      iconSide="right"
      iconSize="s"
      data-test-subj="workflowYamlEditorDocumentationLink"
    >
      <EuiText size="xs">
        <b>
          <FormattedMessage
            id="workflows.workflowDetail.yamlEditor.documentation"
            defaultMessage="Documentation"
          />
        </b>
      </EuiText>
    </EuiButtonEmpty>
  );
}
