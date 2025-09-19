/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';

interface WorkflowsEmptyStateProps {
  onCreateWorkflow?: () => void;
  canCreateWorkflow?: boolean;
}

export function WorkflowsEmptyState({
  onCreateWorkflow,
  canCreateWorkflow = false,
}: WorkflowsEmptyStateProps) {
  const { http } = useKibana().services;
  return (
    <EuiEmptyPrompt
      icon={
        <EuiImage
          size="fullWidth"
          src={http!.basePath.prepend('/plugins/workflowsManagement/assets/empty_state.svg')}
          alt=""
        />
      }
      title={
        <EuiFlexGroup
          alignItems="center"
          justifyContent="center"
          gutterSize="s"
          responsive={false}
          wrap={false}
        >
          <EuiFlexItem grow={false}>
            <h2 style={{ whiteSpace: 'nowrap' }}>
              <FormattedMessage
                id="workflows.emptyState.title"
                defaultMessage="Get Started with Workflows"
              />
            </h2>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              title={
                <FormattedMessage
                  id="workflows.emptyState.technicalPreviewBadge"
                  defaultMessage="Technical Preview"
                />
              }
              content={
                <FormattedMessage
                  id="workflows.emptyState.technicalPreviewTooltip"
                  defaultMessage="This functionality is experimental and not supported. It may change or be removed at any time."
                />
              }
            >
              <EuiBetaBadge
                label={
                  <FormattedMessage
                    id="workflows.emptyState.technicalPreviewBadge"
                    defaultMessage="Technical Preview"
                  />
                }
                title="Technical Preview"
                size="s"
                style={{ alignSelf: 'center', verticalAlign: 'middle' }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      layout="horizontal"
      color="plain"
      body={
        <>
          <p>
            <FormattedMessage
              id="workflows.emptyState.body.firstParagraph"
              defaultMessage="Workflows let you automate and orchestrate security actions across your environment. Build step-by-step processes to enrich alerts, trigger responses, or streamline investigations—all in one place. Start by creating a workflow to simplify repetitive tasks and improve efficiency."
            />
          </p>
        </>
      }
      actions={
        canCreateWorkflow && onCreateWorkflow ? (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton color="primary" fill onClick={onCreateWorkflow} iconType="plusInCircle">
                <FormattedMessage
                  id="workflows.emptyState.createButton"
                  defaultMessage="Create a new workflow"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href="https://github.com/elastic/workflow-examples"
                target="_blank"
                iconType="popout"
                iconSide="right"
              >
                <FormattedMessage
                  id="workflows.emptyState.exampleWorkflowsButton"
                  defaultMessage="Example workflows"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <span>
              <FormattedMessage
                id="workflows.emptyState.footer.title"
                defaultMessage="Need help?"
              />
            </span>
          </EuiTitle>{' '}
          <EuiLink href="#" target="_blank">
            <FormattedMessage
              id="workflows.emptyState.footer.link"
              defaultMessage="Read documentation"
            />
          </EuiLink>
        </>
      }
    />
  );
}
