/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiButton,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { ElasticsearchStepData } from '../lib/elasticsearch_step_utils';
import {
  copyStepAs,
  copyAsConsole,
  COPY_AS_LANGUAGES,
  type CopyAsLanguage,
  type CopyAsOptions,
} from '../lib/copy_request_utils';

export interface ElasticsearchStepHoverMenuProps {
  step: ElasticsearchStepData;
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  anchorPosition?:
    | 'upCenter'
    | 'upLeft'
    | 'upRight'
    | 'downCenter'
    | 'downLeft'
    | 'downRight'
    | 'leftCenter'
    | 'leftUp'
    | 'leftDown'
    | 'rightCenter'
    | 'rightUp'
    | 'rightDown';
}

export const ElasticsearchStepHoverMenu: React.FC<ElasticsearchStepHoverMenuProps> = ({
  step,
  http,
  notifications,
  esHost,
  kibanaHost,
  anchorPosition = 'downLeft',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const copyAsOptions: CopyAsOptions = {
    http,
    notifications,
    esHost,
    kibanaHost,
  };

  const button = (
    <EuiButton
      iconType="copyClipboard"
      size="s"
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      data-test-subj="elasticsearchStepCopyAsButton"
    >
      <FormattedMessage
        id="workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAs"
        defaultMessage="Copy as"
      />
    </EuiButton>
  );

  const handleCopyAs = async (language: CopyAsLanguage) => {
    setIsPopoverOpen(false);
    await copyStepAs(step, language, copyAsOptions);
  };

  const handleCopyAsConsole = async () => {
    setIsPopoverOpen(false);
    await copyAsConsole(step, copyAsOptions);
  };

  const items = [
    // Console format first
    <EuiContextMenuItem
      key="console"
      data-test-subj="copyAsConsole"
      onClick={handleCopyAsConsole}
      icon="console"
    >
      <FormattedMessage
        id="workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAsConsole"
        defaultMessage="Console format"
      />
    </EuiContextMenuItem>,

    // Then language formats
    ...COPY_AS_LANGUAGES.map(({ value, label }) => (
      <EuiContextMenuItem
        key={value}
        data-test-subj={`copyAs${value}`}
        onClick={() => handleCopyAs(value)}
        icon="copyClipboard"
      >
        {label}
      </EuiContextMenuItem>
    )),
  ];

  return (
    <EuiPopover
      id="elasticsearchStepHoverMenu"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
    >
      <div style={{ minWidth: 200 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #d3dae6' }}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="storage" size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>
                  <FormattedMessage
                    id="workflows.workflowDetail.yamlEditor.elasticsearchStep.title"
                    defaultMessage="Elasticsearch API"
                  />
                </strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {step.method} {step.url}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <EuiContextMenuPanel items={items} data-test-subj="elasticsearchStepCopyAsMenu" />
      </div>
    </EuiPopover>
  );
};

/**
 * Compact version of the hover menu for inline display
 */
export const ElasticsearchStepHoverMenuCompact: React.FC<ElasticsearchStepHoverMenuProps> = ({
  step,
  http,
  notifications,
  esHost,
  kibanaHost,
  anchorPosition = 'downLeft',
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const copyAsOptions: CopyAsOptions = {
    http,
    notifications,
    esHost,
    kibanaHost,
  };

  const button = (
    <EuiButton
      iconType="boxesVertical"
      size="s"
      fill={false}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      data-test-subj="elasticsearchStepMenuButton"
      aria-label={i18n.translate(
        'workflows.workflowDetail.yamlEditor.elasticsearchStep.menuAriaLabel',
        {
          defaultMessage: 'Elasticsearch step options',
        }
      )}
    />
  );

  const handleCopyAs = async (language: CopyAsLanguage) => {
    setIsPopoverOpen(false);
    await copyStepAs(step, language, copyAsOptions);
  };

  const handleCopyAsConsole = async () => {
    setIsPopoverOpen(false);
    await copyAsConsole(step, copyAsOptions);
  };

  const items = [
    <EuiContextMenuItem
      key="console"
      data-test-subj="copyAsConsole"
      onClick={handleCopyAsConsole}
      icon="console"
    >
      <FormattedMessage
        id="workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAsConsole"
        defaultMessage="Copy as Console"
      />
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="curl"
      data-test-subj="copyAsCurl"
      onClick={() => handleCopyAs('curl')}
      icon="copyClipboard"
    >
      <FormattedMessage
        id="workflows.workflowDetail.yamlEditor.elasticsearchStep.copyAsCurl"
        defaultMessage="Copy as cURL"
      />
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      id="elasticsearchStepHoverMenuCompact"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
    >
      <EuiContextMenuPanel items={items} data-test-subj="elasticsearchStepMenuCompact" />
    </EuiPopover>
  );
};
