/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PanelEditFlyout, type PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import type { MarkdownSettingsState } from '../../server/embeddable/schemas';

export interface MarkdownSettingsFlyoutProps {
  api: PanelSettingsApi;
  settings: MarkdownSettingsState;
  onApplySettings: (settings: Partial<MarkdownSettingsState>) => Promise<void>;
  closeFlyout: () => void;
  ariaLabelledBy: string;
}

/**
 * The markdown content is edited in the panel itself, so this flyout only has the panel
 * settings and no preview.
 */
export const MarkdownSettingsFlyout = ({
  api,
  settings,
  onApplySettings,
  closeFlyout,
  ariaLabelledBy,
}: MarkdownSettingsFlyoutProps) => {
  const initialOpenLinksInNewTab = Boolean(settings?.open_links_in_new_tab);
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(initialOpenLinksInNewTab);

  return (
    <PanelEditFlyout
      api={api}
      title={i18n.translate('dashboardMarkdown.settingsFlyout.title', {
        defaultMessage: 'Markdown settings',
      })}
      panelOptions={
        <EuiFormRow>
          <EuiSwitch
            label={i18n.translate('dashboardMarkdown.openLinksInNewTab', {
              defaultMessage: 'Open links in new tab',
            })}
            checked={openLinksInNewTab}
            onChange={(e) => setOpenLinksInNewTab(e.target.checked)}
            data-test-subj="openLinksInNewTabSwitch"
          />
        </EuiFormRow>
      }
      hasPanelOptionsChanges={openLinksInNewTab !== initialOpenLinksInNewTab}
      onApplyPanelOptions={() => onApplySettings({ open_links_in_new_tab: openLinksInNewTab })}
      closeFlyout={closeFlyout}
      ariaLabelledBy={ariaLabelledBy}
    />
  );
};
