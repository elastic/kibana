/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageBody,
  EuiPageContent_Deprecated as EuiPageContent,
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ControlsPluginStart } from '@kbn/controls-plugin/public/types';
import { ControlGroupContainer } from '@kbn/controls-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

interface ControlGroupExampleProps {
  controls: ControlsPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

const preconfiguredFields = {
  'machine.os.keyword': { title: 'Machine OS', icon: 'compute' },
  'extension.keyword': { title: 'Extension', icon: 'copy' },
  'host.keyword': { title: 'Host', icon: 'package' },
  'geo.srcdest': { title: 'Source / Destination', icon: 'globe' },
  'message.keyword': { title: 'Message', icon: 'string' },
  bytes: { title: 'Bytes', icon: 'database' },
};

const mapFieldsToControlOptions = (controlGroupAPI: ControlGroupContainer, dataViewId?: string) => {
  return [
    {
      id: 0,
      title: 'Check out these pre-configured filter options',
      items: Object.entries(preconfiguredFields).map(([fieldName, meta]) => {
        return {
          name: meta.title,
          icon: meta.icon,
          onClick: () => {
            if (!controlGroupAPI || !dataViewId) return;
            controlGroupAPI.addDataControlFromField({
              title: meta.title,
              fieldName,
              dataViewId,
            });
          },
        };
      }),
    },
  ];
};

const AddPreconfiguredControlButton = ({
  dataViewId,
  api,
}: {
  dataViewId?: string;
  api?: ControlGroupContainer;
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const addControlButton = (
    <EuiButton onClick={() => setIsPopoverOpen(true)} iconType="arrowDown" iconSide="right">
      Add a pre-configured control
    </EuiButton>
  );

  return dataViewId && api ? (
    <EuiPopover
      id={'addControlPopover'}
      button={addControlButton}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={mapFieldsToControlOptions(api, dataViewId)} />
    </EuiPopover>
  ) : null;
};

export const ControlGroupEmbeddableExample = ({
  controls,
  dataViews,
}: ControlGroupExampleProps) => {
  const [dataViewId, setDataViewId] = useState<string>();

  // Store API references in state hooks
  const [parentControlGroupAPI, setParentControlGroupAPI] = useState<ControlGroupContainer>();
  const [childControlGroupAPI, setchildControlGroupAPI] = useState<ControlGroupContainer>();

  // View mode is an example of state managed by the page and passed in as props to control group
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);

  // load the default data view
  useEffect(() => {
    let canceled = false;
    (async () => {
      const defaultDataViewId = await dataViews.getDefaultId();
      if (!defaultDataViewId || canceled) return;
      setDataViewId(defaultDataViewId);
    })();
    return () => {
      canceled = true;
    };
  }, [dataViews]);

  // set up subscriptions using control group API
  useEffect(() => {
    if (!parentControlGroupAPI || !childControlGroupAPI) return;

    const subscription = parentControlGroupAPI.onFiltersPublished$.subscribe(
      (parentOutputFilters) => childControlGroupAPI.updateFilterContext(parentOutputFilters)
    );
    return () => subscription?.unsubscribe();
  }, [parentControlGroupAPI, childControlGroupAPI]);

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Control Group Embeddable Imperative API Example</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            Pages can manage a subset of Embeddable state and pass it in via props. Embeddable
            building blocks will respond and re-render when these props change. This example app
            owns the ViewMode state.
          </EuiText>
          <EuiButton
            onClick={() =>
              setViewMode((currentViewMode) => {
                return currentViewMode === ViewMode.VIEW ? ViewMode.EDIT : ViewMode.VIEW;
              })
            }
          >
            Switch to {viewMode === ViewMode.VIEW ? 'edit mode' : 'view mode'}
          </EuiButton>

          <EuiSpacer size="xxl" />

          <EuiText>
            The following is a blank Control Group. The Add control button is configured in the
            example app, and adds Controls to the group via the API.
          </EuiText>
          <EuiPanel>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <controls.ControlGroupRenderer
                  onEmbeddableLoad={(controlGroup) => setParentControlGroupAPI(controlGroup)}
                  input={{ viewMode }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddPreconfiguredControlButton
                  dataViewId={dataViewId}
                  api={parentControlGroupAPI}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="xxl" />
          <EuiText>
            This control group is set up to recieve filters outputted from the above Control Group
          </EuiText>
          <EuiPanel>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem>
                <controls.ControlGroupRenderer
                  onEmbeddableLoad={(controlGroup) => setchildControlGroupAPI(controlGroup)}
                  input={{ viewMode }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <AddPreconfiguredControlButton dataViewId={dataViewId} api={childControlGroupAPI} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
