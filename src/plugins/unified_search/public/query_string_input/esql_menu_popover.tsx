/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiButton,
  type EuiContextMenuPanelDescriptor,
  EuiContextMenuItem,
  EuiContextMenu,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import { FEEDBACK_LINK } from '@kbn/esql-utils';
import { getRecommendedQueries } from '@kbn/esql-validation-autocomplete';
import { LanguageDocumentationFlyout } from '@kbn/language-documentation';
import type { IUnifiedSearchPluginServices } from '../types';

export interface ESQLMenuPopoverProps {
  onESQLDocsFlyoutVisibilityChanged?: (isOpen: boolean) => void;
  adHocDataview?: DataView | string;
  onESQLQuerySubmit?: (query: string) => void;
}

export const ESQLMenuPopover: React.FC<ESQLMenuPopoverProps> = ({
  onESQLDocsFlyoutVisibilityChanged,
  adHocDataview,
  onESQLQuerySubmit,
}) => {
  const kibana = useKibana<IUnifiedSearchPluginServices>();

  const { docLinks } = kibana.services;
  const [isESQLMenuPopoverOpen, setIsESQLMenuPopoverOpen] = useState(false);
  const [isLanguageComponentOpen, setIsLanguageComponentOpen] = useState(false);

  const toggleLanguageComponent = useCallback(async () => {
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsESQLMenuPopoverOpen(false);
  }, [isLanguageComponentOpen]);

  const onHelpMenuVisibilityChange = useCallback(
    (status: boolean) => {
      setIsLanguageComponentOpen(status);
      onESQLDocsFlyoutVisibilityChanged?.(status);
    },
    [setIsLanguageComponentOpen, onESQLDocsFlyoutVisibilityChanged]
  );

  const esqlContextMenuPanels = useMemo(() => {
    const recommendedQueries = [];
    if (adHocDataview && typeof adHocDataview !== 'string') {
      const queryString = `from ${adHocDataview.name}`;
      const timeFieldName =
        adHocDataview.timeFieldName ?? adHocDataview.fields?.getByType('date')?.[0]?.name;

      recommendedQueries.push(
        ...getRecommendedQueries({
          fromCommand: queryString,
          timeField: timeFieldName,
        })
      );
    }
    const panels = [
      {
        id: 0,
        items: [
          {
            name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.quickReference', {
              defaultMessage: 'Quick Reference',
            }),
            icon: 'nedocumentationsted',
            renderItem: () => (
              <EuiContextMenuItem
                key="quickReference"
                icon="documentation"
                data-test-subj="esql-quick-reference"
                onClick={() => toggleLanguageComponent()}
              >
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.quickReference', {
                  defaultMessage: 'Quick Reference',
                })}
              </EuiContextMenuItem>
            ),
          },
          {
            name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
              defaultMessage: 'Documentation',
            }),
            icon: 'iInCircle',
            renderItem: () => (
              <EuiContextMenuItem
                key="about"
                icon="iInCircle"
                data-test-subj="esql-about"
                target="_blank"
                href={docLinks.links.query.queryESQL}
                onClick={() => setIsESQLMenuPopoverOpen(false)}
              >
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.documentation', {
                  defaultMessage: 'Documentation',
                })}
              </EuiContextMenuItem>
            ),
          },
          ...(Boolean(recommendedQueries.length)
            ? [
                {
                  name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.exampleQueries', {
                    defaultMessage: 'Recommended queries',
                  }),
                  icon: 'nested',
                  panel: 1,
                  'data-test-subj': 'esql-recommended-queries',
                },
              ]
            : []),
          {
            name: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.feedback', {
              defaultMessage: 'Submit feedback',
            }),
            icon: 'editorComment',
            renderItem: () => (
              <EuiContextMenuItem
                key="feedback"
                icon="editorComment"
                data-test-subj="esql-feedback"
                target="_blank"
                href={FEEDBACK_LINK}
                onClick={() => setIsESQLMenuPopoverOpen(false)}
              >
                {i18n.translate('unifiedSearch.query.queryBar.esqlMenu.feedback', {
                  defaultMessage: 'Submit feedback',
                })}
              </EuiContextMenuItem>
            ),
          },
        ],
      },
      {
        id: 1,
        title: i18n.translate('unifiedSearch.query.queryBar.esqlMenu.exampleQueries', {
          defaultMessage: 'Recommended queries',
        }),
        items: recommendedQueries.map((query) => {
          return {
            name: query.label,
            onClick: () => {
              onESQLQuerySubmit?.(query.queryString);
              setIsESQLMenuPopoverOpen(false);
            },
          };
        }),
      },
    ];
    return panels as EuiContextMenuPanelDescriptor[];
  }, [adHocDataview, docLinks.links.query.queryESQL, onESQLQuerySubmit, toggleLanguageComponent]);

  return (
    <>
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
        <EuiContextMenu initialPanelId={0} panels={esqlContextMenuPanels} />
      </EuiPopover>
      <LanguageDocumentationFlyout
        searchInDescription
        linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
        isHelpMenuOpen={isLanguageComponentOpen}
        onHelpMenuVisibilityChange={onHelpMenuVisibilityChange}
      />
    </>
  );
};
