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
  EuiButtonIcon,
  EuiContextMenuPanel,
  type EuiContextMenuPanelProps,
  EuiContextMenuItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { IUnifiedSearchPluginServices } from '../types';

export interface ESQLMenuPopoverProps {
  onDataViewSwitch: () => void;
  openESQLInlineDocs?: () => void;
}

export const ESQLMenuPopover = ({ onDataViewSwitch, openESQLInlineDocs }: ESQLMenuPopoverProps) => {
  const kibana = useKibana<IUnifiedSearchPluginServices>();

  const { docLinks } = kibana.services;
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const esqlPanelItems = useMemo(() => {
    const panelItems: EuiContextMenuPanelProps['items'] = [];
    if (openESQLInlineDocs) {
      panelItems.push(
        <EuiContextMenuItem
          key="open-docs"
          icon="documentation"
          data-test-subj="esql-open-docs"
          onClick={() => {
            openESQLInlineDocs?.();
            setIsESQLMenuPopoverOpen(false);
          }}
        >
          {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.openDocs', {
            defaultMessage: 'Open docs',
          })}
        </EuiContextMenuItem>
      );
    }
    panelItems.push(
      <EuiContextMenuItem
        key="about"
        icon="iInCircle"
        data-test-subj="esql-about"
        target="_blank"
        href={docLinks.links.query.queryESQL}
      >
        {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.aboutESQL', {
          defaultMessage: 'About ES|QL',
        })}
      </EuiContextMenuItem>,
      <EuiHorizontalRule margin="none" key="dataviewActions-divider" />,
      <EuiContextMenuItem
        key="switch"
        icon="editorRedo"
        data-test-subj="switch-to-dataviews"
        onClick={() => {
          onDataViewSwitch();
          setIsESQLMenuPopoverOpen(false);
        }}
      >
        {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.switchToDataviews', {
          defaultMessage: 'Switch to data views',
        })}
      </EuiContextMenuItem>
    );
    return panelItems;
  }, [docLinks?.links?.query?.queryESQL, onDataViewSwitch, openESQLInlineDocs]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType={isESQLMenuPopoverOpen ? 'cross' : 'boxesHorizontal'}
          color="text"
          display="base"
          onClick={() => setIsESQLMenuPopoverOpen(!isESQLMenuPopoverOpen)}
          data-test-subj="esql-menu-button"
        />
      }
      panelProps={{
        ['data-test-subj']: 'esql-menu-popover',
      }}
      isOpen={isESQLMenuPopoverOpen}
      closePopover={() => setIsESQLMenuPopoverOpen(false)}
      panelPaddingSize="none"
      display="block"
    >
      <EuiContextMenuPanel size="s" items={esqlPanelItems} />
    </EuiPopover>
  );
};
