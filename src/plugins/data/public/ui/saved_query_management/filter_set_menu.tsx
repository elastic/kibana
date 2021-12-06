/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiText,
  toSentenceCase,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  language: 'lucene' | 'text' | 'KQL';
  onEnableAll: () => void;
  onDisableAll: () => void;
  onToggleAllNegated: () => void;
  onRemoveAll: () => void;
  onSaveQuery: () => void;
}

export function FilterSetMenu({
  language,
  onEnableAll,
  onDisableAll,
  onToggleAllNegated,
  onRemoveAll,
  onSaveQuery,
}: Props) {
  const [isPopoverOpen, setPopover] = useState(false);

  const normalContextMenuPopoverId = useGeneratedHtmlId({
    prefix: 'normalContextMenuPopover',
  });
  const onButtonClick = () => {
    setPopover(!isPopoverOpen);
  };

  const closePopover = () => {
    setPopover(false);
  };

  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Load filter set...',
          onClick: () => {
            closePopover();
          },
        },
        { isSeparator: true },
        {
          name: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
            defaultMessage: 'Save current filter set',
          }),
          icon: 'save',
          panel: 1,
        },
        {
          name: 'Inspect current filter set...',
          icon: 'inspect',
          onClick: () => {
            closePopover();
          },
        },
        {
          name: i18n.translate('data.filter.options.applyAllFiltersButtonLabel', {
            defaultMessage: 'Apply to all',
          }),
          icon: 'filter',
          panel: 2,
        },
        {
          name: i18n.translate('data.filter.options.clearllFiltersButtonLabel', {
            defaultMessage: 'Clear all',
          }),
          icon: 'crossInACircleFilled',
          onClick: () => {
            closePopover();
            onRemoveAll();
          },
        },
        { isSeparator: true },
        {
          name: `Language: ${toSentenceCase(language)}`,
          panel: 3,
        },
      ],
    },
    {
      id: 1,
      title: i18n.translate('data.filter.options.saveCurrentFilterSetLabel', {
        defaultMessage: 'Save current filter set',
      }),
      content: (
        <div style={{ padding: 16 }}>
          <EuiButton fill onClick={onSaveQuery}>
            Save
          </EuiButton>
        </div>
      ),
    },
    {
      id: 2,
      initialFocusedItemIndex: 1,
      title: 'Apply to all',
      items: [
        {
          name: i18n.translate('data.filter.options.enableAllFiltersButtonLabel', {
            defaultMessage: 'Enable all',
          }),
          icon: 'eye',
          onClick: () => {
            closePopover();
            onEnableAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.disableAllFiltersButtonLabel', {
            defaultMessage: 'Disable all',
          }),
          icon: 'eyeClosed',
          onClick: () => {
            closePopover();
            onDisableAll();
          },
        },
        {
          name: i18n.translate('data.filter.options.invertNegatedFiltersButtonLabel', {
            defaultMessage: 'Invert inclusion',
          }),
          icon: 'invert',
          onClick: () => {
            closePopover();
            onToggleAllNegated();
          },
        },
      ],
    },
    {
      id: 3,
      title: 'Filter language',
      content: <div style={{ padding: 16 }}>{toSentenceCase(language)}</div>,
    },
  ] as EuiContextMenuPanelDescriptor[];

  const buttonLabel = i18n.translate('data.filter.options.filterSetButtonLabel', {
    defaultMessage: 'Filter set menu',
  });

  const button = (
    <EuiButtonIcon
      onClick={onButtonClick}
      iconType="filter"
      aria-label={buttonLabel}
      title={buttonLabel}
      data-test-subj="showFilterSetMenu"
    />
  );

  return (
    <React.Fragment>
      <EuiPopover
        id={normalContextMenuPopoverId}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        anchorPosition="rightUp"
        repositionOnScroll
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </React.Fragment>
  );
}
