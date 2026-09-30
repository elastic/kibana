/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonGroup,
  type EuiButtonGroupOptionProps,
  EuiCheckbox,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiRadio,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../hooks/use_kibana';
import {
  getShowCreationEmptyState,
  setShowCreationEmptyState,
  subscribeShowCreationEmptyState,
} from './workflow_creation_empty_state_prototype';
import {
  getWorkflowSettingsBNodeLayout,
  getWorkflowSettingsSurfaceVariant,
  setWorkflowSettingsBNodeLayout,
  setWorkflowSettingsSurfaceVariant,
  subscribeWorkflowSettingsSurfaceVariant,
  type WorkflowSettingsBNodeLayout,
  type WorkflowSettingsSurfaceVariant,
} from './workflow_settings_surface_variant';

const B_LAYOUT_OPTIONS: EuiButtonGroupOptionProps[] = [
  {
    id: 'row',
    label: i18n.translate('workflows.settingsSurface.switcher.bLayout.row', {
      defaultMessage: 'Row',
    }),
  },
  {
    id: 'vertical',
    label: i18n.translate('workflows.settingsSurface.switcher.bLayout.vertical', {
      defaultMessage: 'Vertical',
    }),
  },
  {
    id: 'compact',
    label: i18n.translate('workflows.settingsSurface.switcher.bLayout.compact', {
      defaultMessage: 'Compact',
    }),
  },
];

const SettingsSurfacePrototypeNavControl = () => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<WorkflowSettingsSurfaceVariant>(() =>
    getWorkflowSettingsSurfaceVariant()
  );
  const [bLayout, setBLayout] = useState<WorkflowSettingsBNodeLayout>(() =>
    getWorkflowSettingsBNodeLayout()
  );
  const [showCreationEmptyState, setShowCreationEmptyStateLocal] = useState(() =>
    getShowCreationEmptyState()
  );
  const titleId = useGeneratedHtmlId({ prefix: 'workflowSettingsSurfacePrototype' });
  const radioAId = useGeneratedHtmlId({ prefix: 'settingsSurfaceA' });
  const radioBId = useGeneratedHtmlId({ prefix: 'settingsSurfaceB' });
  const radioCId = useGeneratedHtmlId({ prefix: 'settingsSurfaceC' });
  const emptyStateCheckboxId = useGeneratedHtmlId({ prefix: 'creationEmptyState' });

  useEffect(
    () =>
      subscribeWorkflowSettingsSurfaceVariant(() => {
        setValue(getWorkflowSettingsSurfaceVariant());
        setBLayout(getWorkflowSettingsBNodeLayout());
      }),
    []
  );

  useEffect(
    () =>
      subscribeShowCreationEmptyState(() => {
        setShowCreationEmptyStateLocal(getShowCreationEmptyState());
      }),
    []
  );

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      <EuiButton
        size="s"
        iconType="controls"
        onClick={open}
        data-test-subj="workflowSettingsSurfaceSwitcherButton"
      >
        {i18n.translate('workflows.settingsSurface.switcher.button', {
          defaultMessage: 'Prototype',
        })}
      </EuiButton>
      {isOpen ? (
        <EuiFlyout
          type="push"
          size="s"
          maxWidth={false}
          style={{ width: 280 }}
          onClose={close}
          aria-labelledby={titleId}
          data-test-subj="workflowSettingsSurfaceSwitcher"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id={titleId}>
                <FormattedMessage
                  id="workflows.settingsSurface.switcher.flyoutTitle"
                  defaultMessage="Prototype · Settings"
                />
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="workflows.settingsSurface.switcher.flyoutDescription"
                defaultMessage="Choose which settings-surface pattern to preview on this workflow."
              />
            </EuiText>
            <EuiSpacer size="m" />
            <div
              role="radiogroup"
              aria-label={i18n.translate('workflows.settingsSurface.switcher.legend', {
                defaultMessage: 'Settings surface prototype',
              })}
              data-test-subj="workflowSettingsSurfaceSwitcherOptions"
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: euiTheme.size.m,
              }}
            >
              <EuiRadio
                id={radioAId}
                checked={value === 'a'}
                onChange={() => setWorkflowSettingsSurfaceVariant('a')}
                label={i18n.translate('workflows.settingsSurface.switcher.a', {
                  defaultMessage: 'A · Side panel',
                })}
              />
              <div>
                <EuiRadio
                  id={radioBId}
                  checked={value === 'b'}
                  onChange={() => setWorkflowSettingsSurfaceVariant('b')}
                  label={i18n.translate('workflows.settingsSurface.switcher.b', {
                    defaultMessage: 'B · Info node',
                  })}
                />
                {value === 'b' ? (
                  <div
                    css={{
                      marginTop: euiTheme.size.s,
                      marginLeft: euiTheme.size.l,
                    }}
                    data-test-subj="workflowSettingsSurfaceBLayout"
                  >
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="workflows.settingsSurface.switcher.bLayout.label"
                        defaultMessage="Node layout"
                      />
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiButtonGroup
                      legend={i18n.translate('workflows.settingsSurface.switcher.bLayout.legend', {
                        defaultMessage: 'Option B node layout',
                      })}
                      options={B_LAYOUT_OPTIONS}
                      idSelected={bLayout}
                      onChange={(id) =>
                        setWorkflowSettingsBNodeLayout(id as WorkflowSettingsBNodeLayout)
                      }
                      buttonSize="compressed"
                      color="primary"
                      data-test-subj="workflowSettingsSurfaceBLayoutOptions"
                    />
                  </div>
                ) : null}
              </div>
              <EuiRadio
                id={radioCId}
                checked={value === 'c'}
                onChange={() => setWorkflowSettingsSurfaceVariant('c')}
                label={i18n.translate('workflows.settingsSurface.switcher.c', {
                  defaultMessage: 'C · Collapsible',
                })}
              />
            </div>
            <EuiSpacer size="l" />
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="workflows.settingsSurface.switcher.creationEmptyStateDescription"
                defaultMessage="Empty-canvas creation experience (AI prompt, triggers, templates). Off by default — new workflows open on the visual builder."
              />
            </EuiText>
            <EuiSpacer size="s" />
            <EuiCheckbox
              id={emptyStateCheckboxId}
              checked={showCreationEmptyState}
              onChange={(e) => setShowCreationEmptyState(e.target.checked)}
              label={i18n.translate('workflows.settingsSurface.switcher.creationEmptyState', {
                defaultMessage: 'Show empty state',
              })}
              data-test-subj="workflowCreationEmptyStatePrototypeCheckbox"
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </>
  );
};

export interface WorkflowSettingsSurfaceSwitcherProps {
  readonly value: WorkflowSettingsSurfaceVariant;
  readonly onChange: (next: WorkflowSettingsSurfaceVariant) => void;
}

/**
 * Prototype-only control: mounts a Prototype button in the global header
 * (after the profile menu) that opens a push flyout with A/B/C options.
 */
export function WorkflowSettingsSurfaceSwitcher(_props: WorkflowSettingsSurfaceSwitcherProps) {
  const { chrome } = useKibana().services;

  useEffect(() => {
    chrome.controls.appendRight.set(<SettingsSurfacePrototypeNavControl />);
    return () => {
      chrome.controls.appendRight.set(undefined);
    };
  }, [chrome]);

  return null;
}
