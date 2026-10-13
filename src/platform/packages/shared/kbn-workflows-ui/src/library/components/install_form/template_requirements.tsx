/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { InstallFormField } from '@kbn/workflows-library';
import { TypeIcon } from '../../../components';
import { useWorkflowsUiServices } from '../../../context';
import { getConnectorTypeLabel } from '../../lib';

/** Stands in for the inputs the user has to provide themselves (no logo to show). */
const INPUT_ICON = 'gear';

export interface TemplateRequirementsProps {
  /** The template's `install.form` fields. Renders nothing when empty. */
  fields: InstallFormField[];
}

/**
 * "What you'll need" summary shown before setup: one row per install-form
 * field, so the user knows what the template will ask for before opening it.
 * Connector fields show the connector type's logo and display name; everything
 * else shows the author's field label.
 */
export const TemplateRequirements = React.memo<TemplateRequirementsProps>(
  function TemplateRequirements({ fields }) {
    const { triggersActionsUi } = useWorkflowsUiServices();

    if (fields.length === 0) {
      return null;
    }

    return (
      <div data-test-subj="workflowLibraryTemplateRequirements">
        <EuiTitle size="xs">
          <h2>
            {i18n.translate('workflows.library.requirements.title', {
              defaultMessage: "What you'll need",
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {fields.map((field) => (
            <EuiFlexItem key={field.name} grow={false}>
              <EuiPanel
                hasBorder
                hasShadow={false}
                paddingSize="s"
                data-test-subj={`workflowLibraryTemplateRequirements-requirement-${field.name}`}
              >
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {field.inputType === 'connector' ? (
                      <TypeIcon type={field.connectorType} kind="step" size="m" />
                    ) : (
                      <EuiIcon type={INPUT_ICON} size="m" aria-hidden={true} />
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      {field.inputType === 'connector'
                        ? getConnectorTypeLabel(
                            field.connectorType,
                            triggersActionsUi.actionTypeRegistry
                          )
                        : field.label ?? field.name}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    );
  }
);
TemplateRequirements.displayName = 'TemplateRequirements';
