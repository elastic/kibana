/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiMarkdownEditorUiPlugin,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LazyDashboardPicker } from '@kbn/presentation-util-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import React from 'react';
import { useMemo, useState } from 'react';
import { DashboardLinkConfig, DASHBOARD_LINK_PREFIX } from './dashboard_links_plugin';

const DashboardPicker = withSuspense(LazyDashboardPicker);

export const DashboardLinkEditorUi: EuiMarkdownEditorUiPlugin = {
  name: 'dashboardLink',
  button: {
    label: i18n.translate('dashboardMarkdown.dashboardLink.buttonLabel', {
      defaultMessage: 'Dashboard link',
    }),
    iconType: 'dashboardApp',
  },
  helpText: i18n.translate('dashboardMarkdown.dashboardLink.helpText', {
    defaultMessage: 'Links to a Dashboard',
  }),
  editor: function Editor({ node, onSave, onCancel }) {
    const [linkDisplayName, setLinkDisplayName] = useState<string>('');
    const [selectedDashboard, setSelectedDashboard] = useState<DashboardLinkConfig | null>(null);

    const contentJSON = useMemo(() => {
      const selected: DashboardLinkConfig = {
        name: linkDisplayName || selectedDashboard?.name,
        id: selectedDashboard?.id,
      };
      return JSON.stringify(selected);
    }, [selectedDashboard, linkDisplayName]);

    return (
      <div role="dialog" aria-modal="true">
        <EuiModalHeader>
          <EuiModalHeaderTitle component="h2">
            {i18n.translate('dashboardMarkdown.dashboardLinkModal.title', {
              defaultMessage: 'Add dashboard link',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <>
            <EuiFormRow
              hasChildLabel={false}
              label={i18n.translate('dashboardMarkdown.dashboardLinkModal.dashboardChooseTitle', {
                defaultMessage: 'Choose dashboard',
              })}
            >
              <DashboardPicker
                isDisabled={false}
                onChange={(dashboard) => {
                  setSelectedDashboard(dashboard);
                }}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('dashboardMarkdown.dashboardLinkModal.linkTitleRow', {
                defaultMessage: 'Link title',
              })}
            >
              <EuiFieldText
                placeholder={selectedDashboard?.name}
                value={linkDisplayName}
                onChange={(e) => setLinkDisplayName(e.target.value)}
              />
            </EuiFormRow>
          </>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty data-test-subj="cancelCopyToButton" onClick={() => onCancel()}>
            {i18n.translate('dashboardMarkdown.dashboardLinkModal.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            fill
            data-test-subj="confirmCopyToButton"
            disabled={!selectedDashboard}
            onClick={() => {
              onSave(`${DASHBOARD_LINK_PREFIX}${contentJSON}}`, { block: false });
            }}
          >
            {i18n.translate('dashboardMarkdown.dashboardLinkModal.add', {
              defaultMessage: 'Add',
            })}
          </EuiButton>
        </EuiModalFooter>
      </div>
    );
  },
};
