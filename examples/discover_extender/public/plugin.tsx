/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiDataGridCellValueElementProps,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import React, { useEffect } from 'react';

export interface DiscoverExtenderStartPlugins {
  discover: DiscoverStart;
}

export class DiscoverExtenderPlugin implements Plugin {
  setup() {}

  start(_: CoreStart, plugins: DiscoverExtenderStartPlugins) {
    const { discover } = plugins;

    discover.extensions.set({
      id: 'top_nav',
      defaultMenu: {
        options: { disabled: true },
        new: { disabled: true },
        open: { disabled: true },
        share: { order: 200 },
        alerts: { disabled: true },
        inspect: { disabled: true },
        save: { order: 400 },
      },
      getMenuItems: () => [
        {
          data: {
            id: 'options',
            label: 'Options',
            iconType: 'arrowDown',
            iconSide: 'right',
            run: () => alert('Options menu opened'),
          },
          order: 100,
        },
        {
          data: {
            id: 'documentExplorer',
            label: 'Document explorer',
            iconType: 'discoverApp',
            run: () => {
              discover.extensions.disable('top_nav');
              discover.extensions.disable('search_bar');
              discover.extensions.disable('field_popover');
              discover.extensions.disable('data_grid');
              setTimeout(() => {
                discover.extensions.enable('top_nav');
                discover.extensions.enable('search_bar');
                discover.extensions.enable('field_popover');
                discover.extensions.enable('data_grid');
              }, 5000);
            },
          },
          order: 300,
        },
      ],
    });

    discover.extensions.set({
      id: 'search_bar',
      CustomDataViewPicker: () => (
        <EuiButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => alert('Data view picker opened')}
        >
          [Logs] System
        </EuiButton>
      ),
    });

    discover.extensions.set({
      id: 'field_popover',
      CustomBottomButton: () => (
        <EuiButton
          color="success"
          size="s"
          iconType="machineLearningApp"
          onClick={() => alert('Categorize flyout opened')}
        >
          Categorize
        </EuiButton>
      ),
    });

    const MoreMenuCell = ({ setCellProps }: EuiDataGridCellValueElementProps) => {
      useEffect(() => {
        setCellProps({
          style: {
            padding: 0,
          },
        });
      }, [setCellProps]);

      return (
        <EuiButtonIcon
          color="text"
          iconType="boxesHorizontal"
          onClick={() => alert('More menu opened')}
        />
      );
    };

    discover.extensions.set({
      id: 'data_grid',
      defaultLeadingControlColumns: {
        select: { disabled: true },
      },
      getLeadingControlColumns: () => [
        {
          id: 'moreMenu',
          width: 24,
          headerCellRender: () => (
            <EuiScreenReaderOnly>
              <span>More menu</span>
            </EuiScreenReaderOnly>
          ),
          rowCellRender: MoreMenuCell,
        },
      ],
    });
  }
}
