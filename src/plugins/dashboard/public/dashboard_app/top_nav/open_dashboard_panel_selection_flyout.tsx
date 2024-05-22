/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useRef } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  EuiButtonEmpty,
  type EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiListGroup,
  EuiListGroupItem,
  EuiTitle,
  EuiFieldSearch,
  EuiText,
  useEuiTheme,
  type EuiFlyoutProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { pluginServices } from '../../services/plugin_services';
import type { DashboardServices } from '../../services/types';

interface OpenDashboardPanelSelectionFlyoutArgs {
  getPanels: (closePopover: () => void) => EuiContextMenuPanelDescriptor[];
  flyoutPanelPaddingSize?: EuiFlyoutProps['paddingSize'];
}

interface Props extends Pick<OpenDashboardPanelSelectionFlyoutArgs, 'getPanels'> {
  /** Handler to close flyout */
  close: () => void;
  /** Padding for flyout  */
  paddingSize: NonNullable<OpenDashboardPanelSelectionFlyoutArgs['flyoutPanelPaddingSize']>;
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
    paddingSize: flyoutPanelPaddingSize,
    'aria-labelledby': 'add-panels-flyout',
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

    // TODO: handle search
  }, [searchTerm]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h1>
            <FormattedMessage
              id="dashboard.solutionToolbar.addPanelFlyout.headingText"
              defaultMessage="Add Panel"
            />
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" responsive={false}>
          <EuiFlexItem
            grow={false}
            css={{
              position: 'sticky',
              top: euiTheme.size[paddingSize],
              zIndex: 1,
            }}
          >
            <EuiForm component="form" fullWidth>
              <EuiFormRow>
                <EuiFieldSearch
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                  }}
                  aria-label="search field for panels"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" css={{ overflowY: 'auto' }}>
              {Object.values(panelsSearchResult).map(({ id, title, items }) => (
                <React.Fragment key={id}>
                  <EuiFlexItem>
                    <EuiText size="xs">
                      <h3>{title}</h3>
                    </EuiText>
                    <EuiListGroup>
                      {items?.map((item, idx) => {
                        return (
                          <EuiListGroupItem
                            key={`${id}.${idx}`}
                            label={item.name}
                            onClick={item?.onClick}
                            iconType={item.icon}
                            data-test-subj={item['data-test-subj']}
                          />
                        );
                      })}
                    </EuiListGroup>
                  </EuiFlexItem>
                </React.Fragment>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty>
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
