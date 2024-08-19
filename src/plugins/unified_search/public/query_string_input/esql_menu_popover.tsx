/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiPopover,
  EuiButton,
  EuiContextMenuPanel,
  type EuiContextMenuPanelProps,
  EuiContextMenuItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { FEEDBACK_LINK } from '@kbn/esql-utils';
import type { IUnifiedSearchPluginServices } from '../types';

export const ESQLMenuPopover = () => {
  const kibana = useKibana<IUnifiedSearchPluginServices>();

  const { docLinks } = kibana.services;
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const esqlPanelItems = useMemo(() => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    panelItems.push(
      <EuiContextMenuItem
        key="about"
        icon="iInCircle"
        data-test-subj="esql-about"
        target="_blank"
        href={docLinks.links.query.queryESQL}
      >
        {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
          defaultMessage: 'Documentation',
        })}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        key="examples"
        icon="nested"
        data-test-subj="esql-examples"
        target="_blank"
        href={docLinks.links.query.queryESQLExamples}
      >
        {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
          defaultMessage: 'Example queries',
        })}
      </EuiContextMenuItem>,
      <EuiHorizontalRule margin="xs" key="dataviewActions-divider" />,
      <EuiContextMenuItem
        key="feedback"
        icon="editorComment"
        data-test-subj="esql-feedback"
        target="_blank"
        href={FEEDBACK_LINK}
      >
        {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
          defaultMessage: 'Submit feedback',
        })}
      </EuiContextMenuItem>
    );
    return panelItems;
  }, [docLinks.links.query.queryESQL, docLinks.links.query.queryESQLExamples]);

  return (
    <EuiPopover
      button={
        <EuiButton
          color="text"
          onClick={() => setIsESQLMenuPopoverOpen(!isESQLMenuPopoverOpen)}
          data-test-subj="esql-menu-button"
          size="s"
        >
          {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.label', {
            defaultMessage: 'ES|QL help',
          })}
        </EuiButton>
      }
      panelProps={{
        ['data-test-subj']: 'esql-menu-popover',
        css: { width: 240 },
      }}
      isOpen={isESQLMenuPopoverOpen}
      closePopover={() => setIsESQLMenuPopoverOpen(false)}
      panelPaddingSize="s"
      display="block"
    >
      <EuiContextMenuPanel size="s" items={esqlPanelItems} />
    </EuiPopover>
  );
};
