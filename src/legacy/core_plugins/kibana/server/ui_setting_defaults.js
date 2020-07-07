/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { isRelativeUrl } from '../../../../core/server';

export function getUiSettingDefaults() {
  const weekdays = moment.weekdays().slice();
  const [defaultWeekday] = weekdays;

  // wrapped in provider so that a new instance is given to each app/test
  return {
    buildNum: {
      readonly: true,
    },
    'state:storeInSessionStorage': {
      name: i18n.translate('kbn.advancedSettings.storeUrlTitle', {
        defaultMessage: 'Store URLs in session storage',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.storeUrlText', {
        defaultMessage:
          'The URL can sometimes grow to be too large for some browsers to handle. ' +
          'To counter-act this we are testing if storing parts of the URL in session storage could help. ' +
          'Please let us know how it goes!',
      }),
    },
    defaultRoute: {
      name: i18n.translate('kbn.advancedSettings.defaultRoute.defaultRouteTitle', {
        defaultMessage: 'Default route',
      }),
      value: '/app/home',
      schema: schema.string({
        validate(value) {
          if (!value.startsWith('/') || !isRelativeUrl(value)) {
            return i18n.translate(
              'kbn.advancedSettings.defaultRoute.defaultRouteIsRelativeValidationMessage',
              {
                defaultMessage: 'Must be a relative URL.',
              }
            );
          }
        },
      }),
      description: i18n.translate('kbn.advancedSettings.defaultRoute.defaultRouteText', {
        defaultMessage:
          'This setting specifies the default route when opening Kibana. ' +
          'You can use this setting to modify the landing page when opening Kibana. ' +
          'The route must be a relative URL.',
      }),
    },
    dateFormat: {
      name: i18n.translate('kbn.advancedSettings.dateFormatTitle', {
        defaultMessage: 'Date format',
      }),
      value: 'MMM D, YYYY @ HH:mm:ss.SSS',
      description: i18n.translate('kbn.advancedSettings.dateFormatText', {
        defaultMessage: 'When displaying a pretty formatted date, use this {formatLink}',
        description:
          'Part of composite text: kbn.advancedSettings.dateFormatText + ' +
          'kbn.advancedSettings.dateFormat.optionsLinkText',
        values: {
          formatLink:
            '<a href="https://momentjs.com/docs/#/displaying/format/" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.dateFormat.optionsLinkText', {
              defaultMessage: 'format',
            }) +
            '</a>',
        },
      }),
    },
    'dateFormat:tz': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.timezoneTitle', {
        defaultMessage: 'Timezone for date formatting',
      }),
      value: 'Browser',
      description: i18n.translate('kbn.advancedSettings.dateFormat.timezoneText', {
        defaultMessage:
          'Which timezone should be used. {defaultOption} will use the timezone detected by your browser.',
        values: {
          defaultOption: '"Browser"',
        },
      }),
      type: 'select',
      options: [
        'Browser',
        ...moment.tz
          .names()
          // We need to filter out some time zones, that moment.js knows about, but Elasticsearch
          // does not understand and would fail thus with a 400 bad request when using them.
          .filter((tz) => !['America/Nuuk', 'EST', 'HST', 'ROC', 'MST'].includes(tz)),
      ],
      requiresPageReload: true,
    },
    'dateFormat:scaled': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.scaledTitle', {
        defaultMessage: 'Scaled date format',
      }),
      type: 'json',
      value: `[
  ["", "HH:mm:ss.SSS"],
  ["PT1S", "HH:mm:ss"],
  ["PT1M", "HH:mm"],
  ["PT1H", "YYYY-MM-DD HH:mm"],
  ["P1DT", "YYYY-MM-DD"],
  ["P1YT", "YYYY"]
]`,
      description: i18n.translate('kbn.advancedSettings.dateFormat.scaledText', {
        defaultMessage:
          'Values that define the format used in situations where time-based ' +
          'data is rendered in order, and formatted timestamps should adapt to the ' +
          'interval between measurements. Keys are {intervalsLink}.',
        description:
          'Part of composite text: kbn.advancedSettings.dateFormat.scaledText + ' +
          'kbn.advancedSettings.dateFormat.scaled.intervalsLinkText',
        values: {
          intervalsLink:
            '<a href="http://en.wikipedia.org/wiki/ISO_8601#Time_intervals" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.dateFormat.scaled.intervalsLinkText', {
              defaultMessage: 'ISO8601 intervals',
            }) +
            '</a>',
        },
      }),
    },
    'dateFormat:dow': {
      name: i18n.translate('kbn.advancedSettings.dateFormat.dayOfWeekTitle', {
        defaultMessage: 'Day of week',
      }),
      value: defaultWeekday,
      description: i18n.translate('kbn.advancedSettings.dateFormat.dayOfWeekText', {
        defaultMessage: 'What day should weeks start on?',
      }),
      type: 'select',
      options: weekdays,
    },
    dateNanosFormat: {
      name: i18n.translate('kbn.advancedSettings.dateNanosFormatTitle', {
        defaultMessage: 'Date with nanoseconds format',
      }),
      value: 'MMM D, YYYY @ HH:mm:ss.SSSSSSSSS',
      description: i18n.translate('kbn.advancedSettings.dateNanosFormatText', {
        defaultMessage: 'Used for the {dateNanosLink} datatype of Elasticsearch',
        values: {
          dateNanosLink:
            '<a href="https://www.elastic.co/guide/en/elasticsearch/reference/master/date_nanos.html" target="_blank" rel="noopener noreferrer">' +
            i18n.translate('kbn.advancedSettings.dateNanosLinkTitle', {
              defaultMessage: 'date_nanos',
            }) +
            '</a>',
        },
      }),
    },
    'visualization:tileMap:maxPrecision': {
      name: i18n.translate('kbn.advancedSettings.visualization.tileMap.maxPrecisionTitle', {
        defaultMessage: 'Maximum tile map precision',
      }),
      value: 7,
      description: i18n.translate('kbn.advancedSettings.visualization.tileMap.maxPrecisionText', {
        defaultMessage:
          'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, 12 is the max. {cellDimensionsLink}',
        description:
          'Part of composite text: kbn.advancedSettings.visualization.tileMap.maxPrecisionText + ' +
          'kbn.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText',
        values: {
          cellDimensionsLink:
            `<a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator"
            target="_blank" rel="noopener">` +
            i18n.translate(
              'kbn.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText',
              {
                defaultMessage: 'Explanation of cell dimensions',
              }
            ) +
            '</a>',
        },
      }),
      category: ['visualization'],
    },
    'visualization:tileMap:WMSdefaults': {
      name: i18n.translate('kbn.advancedSettings.visualization.tileMap.wmsDefaultsTitle', {
        defaultMessage: 'Default WMS properties',
      }),
      value: JSON.stringify(
        {
          enabled: false,
          url: undefined,
          options: {
            version: undefined,
            layers: undefined,
            format: 'image/png',
            transparent: true,
            attribution: undefined,
            styles: undefined,
          },
        },
        null,
        2
      ),
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.visualization.tileMap.wmsDefaultsText', {
        defaultMessage:
          'Default {propertiesLink} for the WMS map server support in the coordinate map',
        description:
          'Part of composite text: kbn.advancedSettings.visualization.tileMap.wmsDefaultsText + ' +
          'kbn.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText',
        values: {
          propertiesLink:
            '<a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank" rel="noopener noreferrer">' +
            i18n.translate(
              'kbn.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText',
              {
                defaultMessage: 'properties',
              }
            ) +
            '</a>',
        },
      }),
      category: ['visualization'],
    },
    'visualization:regionmap:showWarnings': {
      name: i18n.translate('kbn.advancedSettings.visualization.showRegionMapWarningsTitle', {
        defaultMessage: 'Show region map warning',
      }),
      value: true,
      description: i18n.translate('kbn.advancedSettings.visualization.showRegionMapWarningsText', {
        defaultMessage:
          'Whether the region map shows a warning when terms cannot be joined to a shape on the map.',
      }),
      category: ['visualization'],
    },
    'truncate:maxHeight': {
      name: i18n.translate('kbn.advancedSettings.maxCellHeightTitle', {
        defaultMessage: 'Maximum table cell height',
      }),
      value: 115,
      description: i18n.translate('kbn.advancedSettings.maxCellHeightText', {
        defaultMessage:
          'The maximum height that a cell in a table should occupy. Set to 0 to disable truncation',
      }),
    },
    'timepicker:timeDefaults': {
      name: i18n.translate('kbn.advancedSettings.timepicker.timeDefaultsTitle', {
        defaultMessage: 'Time filter defaults',
      }),
      value: `{
  "from": "now-15m",
  "to": "now"
}`,
      type: 'json',
      description: i18n.translate('kbn.advancedSettings.timepicker.timeDefaultsText', {
        defaultMessage: 'The timefilter selection to use when Kibana is started without one',
      }),
      requiresPageReload: true,
    },
    'theme:darkMode': {
      name: i18n.translate('kbn.advancedSettings.darkModeTitle', {
        defaultMessage: 'Dark mode',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.darkModeText', {
        defaultMessage: `Enable a dark mode for the Kibana UI. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
    },
    'theme:version': {
      name: i18n.translate('kbn.advancedSettings.themeVersionTitle', {
        defaultMessage: 'Theme version',
      }),
      value: 'v7',
      type: 'select',
      options: ['v7', 'v8 (beta)'],
      description: i18n.translate('kbn.advancedSettings.themeVersionText', {
        defaultMessage: `Switch between the theme used for the current and next version of Kibana. A page refresh is required for the setting to be applied.`,
      }),
      requiresPageReload: true,
    },
    'notifications:banner': {
      name: i18n.translate('kbn.advancedSettings.notifications.bannerTitle', {
        defaultMessage: 'Custom banner notification',
      }),
      value: '',
      type: 'markdown',
      description: i18n.translate('kbn.advancedSettings.notifications.bannerText', {
        defaultMessage:
          'A custom banner intended for temporary notices to all users. {markdownLink}.',
        description:
          'Part of composite text: kbn.advancedSettings.notifications.bannerText + ' +
          'kbn.advancedSettings.notifications.banner.markdownLinkText',
        values: {
          markdownLink:
            `<a href="https://help.github.com/articles/basic-writing-and-formatting-syntax/"
            target="_blank" rel="noopener">` +
            i18n.translate('kbn.advancedSettings.notifications.banner.markdownLinkText', {
              defaultMessage: 'Markdown supported',
            }) +
            '</a>',
        },
      }),
      category: ['notifications'],
    },
    'notifications:lifetime:banner': {
      name: i18n.translate('kbn.advancedSettings.notifications.bannerLifetimeTitle', {
        defaultMessage: 'Banner notification lifetime',
      }),
      value: 3000000,
      description: i18n.translate('kbn.advancedSettings.notifications.bannerLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a banner notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable the countdown.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:error': {
      name: i18n.translate('kbn.advancedSettings.notifications.errorLifetimeTitle', {
        defaultMessage: 'Error notification lifetime',
      }),
      value: 300000,
      description: i18n.translate('kbn.advancedSettings.notifications.errorLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an error notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:warning': {
      name: i18n.translate('kbn.advancedSettings.notifications.warningLifetimeTitle', {
        defaultMessage: 'Warning notification lifetime',
      }),
      value: 10000,
      description: i18n.translate('kbn.advancedSettings.notifications.warningLifetimeText', {
        defaultMessage:
          'The time in milliseconds which a warning notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'notifications:lifetime:info': {
      name: i18n.translate('kbn.advancedSettings.notifications.infoLifetimeTitle', {
        defaultMessage: 'Info notification lifetime',
      }),
      value: 5000,
      description: i18n.translate('kbn.advancedSettings.notifications.infoLifetimeText', {
        defaultMessage:
          'The time in milliseconds which an information notification will be displayed on-screen for. ' +
          'Setting to {infinityValue} will disable.',
        values: {
          infinityValue: 'Infinity',
        },
      }),
      type: 'number',
      category: ['notifications'],
    },
    'accessibility:disableAnimations': {
      name: i18n.translate('kbn.advancedSettings.disableAnimationsTitle', {
        defaultMessage: 'Disable Animations',
      }),
      value: false,
      description: i18n.translate('kbn.advancedSettings.disableAnimationsText', {
        defaultMessage:
          'Turn off all unnecessary animations in the Kibana UI. Refresh the page to apply the changes.',
      }),
      category: ['accessibility'],
      requiresPageReload: true,
    },
    pageNavigation: {
      name: i18n.translate('kbn.advancedSettings.pageNavigationName', {
        defaultMessage: 'Side nav style',
      }),
      value: 'modern',
      description: i18n.translate('kbn.advancedSettings.pageNavigationDesc', {
        defaultMessage: 'Change the style of navigation',
      }),
      type: 'select',
      options: ['modern', 'legacy'],
      optionLabels: {
        modern: i18n.translate('kbn.advancedSettings.pageNavigationModern', {
          defaultMessage: 'Modern',
        }),
        legacy: i18n.translate('kbn.advancedSettings.pageNavigationLegacy', {
          defaultMessage: 'Legacy',
        }),
      },
      schema: schema.oneOf([schema.literal('modern'), schema.literal('legacy')]),
    },
  };
}
