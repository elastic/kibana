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
  EuiLink,
  EuiMarkdownEditorUiPlugin,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  RemarkTokenizer,
} from '@elastic/eui';
import { getDashboardLocatorParamsFromEmbeddable } from '@kbn/dashboard-plugin/public';
import type {
  DashboardContainer,
  DashboardLocatorParams,
} from '@kbn/dashboard-plugin/public/dashboard_container';
import { i18n } from '@kbn/i18n';
import { HasParentApi, PublishesUnifiedSearch } from '@kbn/presentation-publishing';
import {
  DashboardDrilldownOptions,
  DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
  LazyDashboardPicker,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import React, { useMemo, useState } from 'react';
import type { Plugin } from 'unified';
import { MarkdownEditorApi } from './types';

const DashboardPicker = withSuspense(LazyDashboardPicker);
const dashboardLinkPrefix = '!{dashboard_link';
interface DashboardLinkConfig {
  name?: string;
  id?: string;
}
export const getDashboardLinksPlugin = (api: MarkdownEditorApi) => {
  const parentDashboard = api.parentApi as DashboardContainer;

  const DashboardLinkParser: Plugin = function () {
    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;

    const dashboardLinkTokenizer: RemarkTokenizer = function (eat, value, silent) {
      if (!value.startsWith(dashboardLinkPrefix)) return false;

      const nextCharacter = value[dashboardLinkPrefix.length];
      if (nextCharacter !== '{') return false;
      if (silent) return true;

      let linkConfigString = '';
      let openObjects = 0;

      for (let i = dashboardLinkPrefix.length; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          linkConfigString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          linkConfigString += char;
        } else {
          linkConfigString += char;
        }
      }

      try {
        const linkConfig = JSON.parse(linkConfigString);
        const match = `${dashboardLinkPrefix}${linkConfigString}}`;
        return eat(match)({
          type: 'DashboardLinks',
          ...linkConfig,
        });
      } catch (err) {
        this.file.fail(
          i18n.translate('dashboardMarkdown.dashboardLink.buttonLabel', {
            values: { err },
            defaultMessage: 'Unable to parse dashboard link JSON: {err}',
          })
        );
      }
    };

    dashboardLinkTokenizer.locator = (value: string, fromIndex: number) => {
      return value.indexOf(dashboardLinkPrefix, fromIndex);
    };
    tokenizers.DashboardLinks = dashboardLinkTokenizer;
    methods.splice(methods.indexOf('text'), 0, 'DashboardLinks');
  };

  const DashboardLinkEditorUi: EuiMarkdownEditorUiPlugin = {
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
                onSave(`${dashboardLinkPrefix}${contentJSON}}`, { block: false });
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

  const DashboardLinkRenderer = ({ name, id }: DashboardLinkConfig) => {
    const locator = parentDashboard.locator;

    const locatorParams = useMemo(() => {
      const linkOptions = {
        ...DEFAULT_DASHBOARD_DRILLDOWN_OPTIONS,
      } as DashboardDrilldownOptions;
      const params: DashboardLocatorParams = {
        dashboardId: id,
        ...getDashboardLocatorParamsFromEmbeddable(
          api as Partial<PublishesUnifiedSearch & HasParentApi<Partial<PublishesUnifiedSearch>>>,
          linkOptions
        ),
      };
      return params;
    }, [id]);

    return (
      <EuiLink
        onClick={() => {
          if (!locator) return;
          locator.navigate(locatorParams);
        }}
      >
        {name}
      </EuiLink>
    );
  };

  return {
    DashboardLinkRenderer,
    DashboardLinkParser,
    DashboardLinkEditorUi,
  };
};
