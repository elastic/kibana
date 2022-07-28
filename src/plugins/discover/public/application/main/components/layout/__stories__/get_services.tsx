/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { TopNavMenu } from '@kbn/navigation-plugin/public';
import { EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { LIGHT_THEME } from '@elastic/charts';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { identity } from 'lodash';
import { IUiSettingsClient } from '@kbn/core/public';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_TABLE_LEGACY,
  MAX_DOC_FIELDS_DISPLAYED,
  ROW_HEIGHT_OPTION,
  SAMPLE_SIZE_SETTING,
  SAMPLE_ROWS_PER_PAGE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SHOW_MULTIFIELDS,
} from '../../../../../../common';
import { SIDEBAR_CLOSED_KEY } from '../discover_layout';
import { LocalStorageMock } from '../../../../../__mocks__/local_storage_mock';
import { DiscoverServices } from '../../../../../build_services';

export const uiSettingsMock = {
  get: (key: string) => {
    if (key === MAX_DOC_FIELDS_DISPLAYED) {
      return 3;
    } else if (key === SAMPLE_SIZE_SETTING) {
      return 10;
    } else if (key === SAMPLE_ROWS_PER_PAGE_SETTING) {
      return 100;
    } else if (key === DEFAULT_COLUMNS_SETTING) {
      return ['default_column'];
    } else if (key === DOC_TABLE_LEGACY) {
      return false;
    } else if (key === SEARCH_FIELDS_FROM_SOURCE) {
      return false;
    } else if (key === SHOW_MULTIFIELDS) {
      return false;
    } else if (key === ROW_HEIGHT_OPTION) {
      return 3;
    } else if (key === 'dateFormat:tz') {
      return true;
    }
  },
  isDefault: () => {
    return true;
  },
} as unknown as IUiSettingsClient;

export function getServices() {
  return {
    core: { http: { basePath: { prepend: () => void 0 } } },
    storage: new LocalStorageMock({
      [SIDEBAR_CLOSED_KEY]: false,
    }) as unknown as Storage,
    data: {
      query: {
        timefilter: {
          timefilter: {
            setTime: action('Set timefilter time'),
            getAbsoluteTime: () => {
              return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
            },
          },
        },
      },
      dataViews: {
        getIdsWithTitle: () => Promise.resolve([]),
      },
    },
    uiSettings: uiSettingsMock,
    dataViewFieldEditor: {
      openEditor: () => void 0,
      userPermissions: {
        editIndexPattern: () => void 0,
      },
    },
    navigation: {
      ui: { TopNavMenu },
    },
    theme: {
      useChartsTheme: () => ({
        ...EUI_CHARTS_THEME_LIGHT.theme,
        chartPaddings: {
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
        },
        heatmap: { xAxisLabel: { rotation: {} } },
      }),
      useChartsBaseTheme: () => LIGHT_THEME,
    },
    capabilities: {
      visualize: {
        show: true,
      },
      discover: {
        save: false,
      },
      advancedSettings: {
        save: true,
      },
    },
    docLinks: { links: { discover: {} } },
    addBasePath: (path: string) => path,
    filterManager: {
      getGlobalFilters: () => [],
      getAppFilters: () => [],
    },
    history: () => ({}),
    fieldFormats: {
      deserialize: () => {
        const DefaultFieldFormat = FieldFormat.from(identity);
        return new DefaultFieldFormat();
      },
    },
    toastNotifications: {
      addInfo: action('add toast'),
    },
  } as unknown as DiscoverServices;
}
