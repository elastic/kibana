/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiEmptyPrompt, EuiIllustration } from '@elastic/eui';
import { relevanceHandTouch } from '@elastic/eui-illustrations';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { PrivilegesFooter } from '../workflows_required_priveleges_footer';
export function WorkflowsEmptyStateReadOnly() {
  return (
    <EuiEmptyPrompt
      icon={
        <EuiIllustration
          type={relevanceHandTouch}
          alt=""
          style={{ maxInlineSize: 240, marginInline: 'auto' }}
        />
      }
      title={
        <h2 style={{ whiteSpace: 'nowrap' }}>
          <FormattedMessage
            id="workflows.emptyStateReadOnly.title"
            defaultMessage="Workflows list will be here"
          />
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>
            <FormattedMessage
              id="workflows.emptyStateReadOnly.body.firstParagraph"
              defaultMessage="Workflows let you automate repetitive tasks and streamline processes across your environment."
            />
          </p>
        </>
      }
      footer={
        <PrivilegesFooter
          permissions={[
            {
              id: 'workflows.writeWorkflowPermissionText',
              default: 'Workflows: Write',
            },
          ]}
        />
      }
    />
  );
}
