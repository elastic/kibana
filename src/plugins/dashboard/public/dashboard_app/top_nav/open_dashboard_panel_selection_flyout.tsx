/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useRef } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n as i18nFn } from '@kbn/i18n';
import orderBy from 'lodash/orderBy';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiBadge,
  EuiFormRow,
  EuiTitle,
  EuiFieldSearch,
  useEuiTheme,
  type EuiFlyoutProps,
  EuiListGroup,
  EuiListGroupItem,
  EuiToolTip,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pluginServices } from '../../services/plugin_services';
import type { DashboardServices } from '../../services/types';
import type { GroupedAddPanelActions, PanelSelectionMenuItem } from './add_panel_action_menu_items';

interface OpenDashboardPanelSelectionFlyoutArgs {
  getPanels: (closePopover: () => void) => GroupedAddPanelActions[];
  flyoutPanelPaddingSize?: Exclude<EuiFlyoutProps['paddingSize'], 'none'>;
}

interface Props extends Pick<OpenDashboardPanelSelectionFlyoutArgs, 'getPanels'> {
  /** Handler to close flyout */
  close: () => void;
  /** Padding for flyout  */
  paddingSize: Exclude<OpenDashboardPanelSelectionFlyoutArgs['flyoutPanelPaddingSize'], undefined>;
}

export function openDashboardPanelSelectionFlyout({
  getPanels,
  flyoutPanelPaddingSize = 'l',
}: OpenDashboardPanelSelectionFlyoutArgs) {
  const {
    overlays,
    analytics,
    settings: { i18n, theme },
  } = pluginServices.getServices();
  // eslint-disable-next-line prefer-const
  let flyoutRef: ReturnType<DashboardServices['overlays']['openFlyout']>;

  const mount = toMountPoint(
    React.createElement(function () {
      const closeFlyout = () => flyoutRef.close();
      return (
        <DashboardPanelSelectionListFlyout
          close={closeFlyout}
          {...{ paddingSize: flyoutPanelPaddingSize, getPanels }}
        />
      );
    }),
    { analytics, theme, i18n }
  );

  flyoutRef = overlays.openFlyout(mount, {
    size: 'm',
    maxWidth: 500,
    paddingSize: flyoutPanelPaddingSize,
    'aria-labelledby': 'addPanelsFlyout',
    'data-test-subj': 'dashboardPanelSelectionFlyout',
  });

  return flyoutRef;
}

export const DashboardPanelSelectionListFlyout: React.FC<Props> = ({
  close,
  getPanels,
  paddingSize,
}) => {
  const { euiTheme } = useEuiTheme();
  const panels = useRef(getPanels(close));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [panelsSearchResult, setPanelsSearchResult] = useState(panels.current);

  useEffect(() => {
    if (!searchTerm) {
      return setPanelsSearchResult(panels.current);
    }

    const q = searchTerm.toLowerCase();

    setPanelsSearchResult(
      orderBy(
        panels.current.map((panel) => {
          const groupSearchMatch = panel.title.toLowerCase().includes(q);

          const [groupSearchMatchAgg, items] = panel.items.reduce(
            (acc, cur) => {
              const searchMatch = cur.name.toLowerCase().includes(q);

              acc[0] = acc[0] || searchMatch;
              acc[1].push({
                ...cur,
                isDisabled: !(groupSearchMatch || searchMatch),
              });

              return acc;
            },
            [groupSearchMatch, [] as PanelSelectionMenuItem[]]
          );

          return {
            ...panel,
            isDisabled: !groupSearchMatchAgg,
            items,
          };
        }),
        ['isDisabled']
      )
    );
  }, [searchTerm]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h1 id="addPanelsFlyout">
            <FormattedMessage
              id="dashboard.solutionToolbar.addPanelFlyout.headingText"
              defaultMessage="Add panel"
            />
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" responsive={false} gutterSize="m">
          <EuiFlexItem
            grow={false}
            css={{
              position: 'sticky',
              top: euiTheme.size[paddingSize],
              zIndex: 1,
              boxShadow: `0 -${euiTheme.size[paddingSize]} 0 4px ${euiTheme.colors.emptyShade}`,
            }}
          >
            <EuiForm component="form" fullWidth>
              <EuiFormRow>
                <EuiFieldSearch
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  aria-label={i18nFn.translate(
                    'dashboard.editorMenu.addPanelFlyout.searchLabelText',
                    { defaultMessage: 'search field for panels' }
                  )}
                  className="nsPanelSelectionFlyout__searchInput"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="m">
              {Object.values(panelsSearchResult).map(
                ({ id, title, items, isDisabled, ['data-test-subj']: dataTestSubj }) => (
                  <EuiFlexItem key={id} data-test-subj={dataTestSubj}>
                    <EuiTitle
                      id={`${id}-group`}
                      size="xxs"
                      css={isDisabled ? { color: euiTheme.colors.disabled } : {}}
                    >
                      {typeof title === 'string' ? <h3>{title}</h3> : title}
                    </EuiTitle>
                    <EuiListGroup
                      aria-labelledby={`${id}-group`}
                      size="s"
                      gutterSize="none"
                      maxWidth={false}
                      flush
                    >
                      {items?.map((item, idx) => {
                        return (
                          <EuiListGroupItem
                            key={`${id}.${idx}`}
                            label={
                              <EuiToolTip position="right" content={item.description}>
                                {!item.isDeprecated ? (
                                  <EuiText size="s">{item.name}</EuiText>
                                ) : (
                                  <EuiFlexGroup wrap responsive={false} gutterSize="s">
                                    <EuiFlexItem grow={false}>
                                      <EuiText size="s">{item.name}</EuiText>
                                    </EuiFlexItem>
                                    <EuiFlexItem grow={false}>
                                      <EuiBadge color="warning">
                                        <FormattedMessage
                                          id="dashboard.editorMenu.deprecatedTag"
                                          defaultMessage="Deprecated"
                                        />
                                      </EuiBadge>
                                    </EuiFlexItem>
                                  </EuiFlexGroup>
                                )}
                              </EuiToolTip>
                            }
                            onClick={item?.onClick}
                            iconType={item.icon}
                            data-test-subj={item['data-test-subj']}
                            isDisabled={item.isDisabled}
                          />
                        );
                      })}
                    </EuiListGroup>
                  </EuiFlexItem>
                )
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={close}>
              <FormattedMessage
                id="dashboard.solutionToolbar.addPanelFlyout.cancelButtonText"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
