/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  render as ReactDOMRender,
  unmountComponentAtNode as ReactDOMUnmountComponentAtNode,
} from 'react-dom';
import React, { useEffect, useState, useRef } from 'react';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DashboardServices } from '../../services/types';

interface OpenAddPanelFlyoutArgs {
  getPanels: (closePopover: () => void) => EuiContextMenuPanelDescriptor[];
}

interface Props extends Pick<OpenAddPanelFlyoutArgs, 'getPanels'> {
  /** Handler to close flyout */
  close: () => void;
}

export const gh = ({ overlays }: Pick<DashboardServices, 'overlays'>) =>
  function openAddPanelFlyout({ getPanels }: OpenAddPanelFlyoutArgs) {
    // eslint-disable-next-line prefer-const
    let flyoutRef: ReturnType<DashboardServices['overlays']['openFlyout']>;

    const closeFlyout = () => flyoutRef.close();

    const mount = (element: HTMLElement) => {
      const reactElement = <AddPanelFlyout close={closeFlyout} getPanels={getPanels} />;

      ReactDOMRender(reactElement, element);

      return () => ReactDOMUnmountComponentAtNode(element);
    };

    flyoutRef = overlays.openFlyout(mount, { size: 'm', 'aria-labelledby': 'add-panels-flyout' });

    return flyoutRef;
  };

export const AddPanelFlyout: React.FC<Props> = ({ close, getPanels }) => {
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
            {i18n.translate('dashboard.solutionToolbar.addPanelFlyout.headingText', {
              defaultMessage: 'Add Panel',
            })}
          </h1>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" responsive={false}>
          <EuiFlexItem
            grow={false}
            css={{
              position: 'sticky',
              top: '24px',
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
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              {Object.values(panelsSearchResult).map(({ id, title, items }) => (
                <React.Fragment key={id}>
                  <EuiFlexItem>
                    <EuiText>
                      <h3>{title}</h3>
                    </EuiText>
                    <EuiListGroup>
                      {items?.map((item) => (
                        <EuiListGroupItem
                          label={item.name}
                          iconType={item.icon!}
                          data-test-subj={item['data-test-subj']}
                        />
                      ))}
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
            <EuiButtonEmpty onClick={close} flush="left">
              {i18n.translate('dashboard.solutionToolbar.addPanelFlyout.cancelButtonText', {
                defaultMessage: 'Close',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
