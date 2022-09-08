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
  EuiPageContent,
  EuiPageContentBody,
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

interface ControlSelectOptions {
  [key: string]: { fieldName: string; displayName: string; icon: string };
}

const preconfiguredParentFields: ControlSelectOptions = {
  machineOS: {
    fieldName: 'machine.os.keyword',
    displayName: 'Machine OS',
    icon: 'user',
  },
  message: {
    fieldName: 'message.keyword',
    displayName: 'Message',
    icon: 'user',
  },
  bytes: {
    fieldName: 'bytes',
    displayName: 'Bytes',
    icon: 'user',
  },
};

const preconfiguredChildFields: ControlSelectOptions = {
  machineOS: {
    fieldName: 'machine.os.keyword',
    displayName: 'Machine OS',
    icon: 'user',
  },
  message: {
    fieldName: 'message.keyword',
    displayName: 'Message',
    icon: 'user',
  },
  bytes: {
    fieldName: 'bytes',
    displayName: 'Bytes',
    icon: 'user',
  },
};

const mapFieldsToControlOptions = (
  availableUUIDs: string[],
  preconfiguredFields: ControlSelectOptions,
  controlGroupAPI: ControlGroupContainer,
  setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setAvailableUUIDs: React.Dispatch<React.SetStateAction<string[]>>,
  dataViewId?: string
) => {
  return [
    {
      id: 0,
      title: 'Check out these pre-configured filter options',
      items: availableUUIDs.map((fieldIdToUse) => {
        const fieldToUse = preconfiguredFields[fieldIdToUse];
        return {
          name: fieldToUse.displayName,
          icon: fieldToUse.icon,
          onClick: () => {
            setIsPopoverOpen(false);
            setAvailableUUIDs((currentAvailableUUIDs) =>
              currentAvailableUUIDs.filter((id) => id !== fieldIdToUse)
            );
            if (!controlGroupAPI || !dataViewId) return;
            controlGroupAPI.addDataControlFromField({
              title: fieldToUse.displayName,
              uuid: fieldIdToUse,
              fieldName: fieldToUse.fieldName,
              dataViewId,
            });
          },
        };
      }),
    },
  ];
};

export const ControlGroupEmbeddableExample = ({
  controls,
  dataViews,
}: ControlGroupExampleProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.EDIT);
  const [dataViewId, setDataViewId] = useState<string>();

  const [isParentPopoverOpen, setIsParentPopoverOpen] = useState(false);
  const [parentControlGroupAPI, setParentControlGroupAPI] = useState<ControlGroupContainer>();
  const [availableParentUUIDs, setAvailableParentUUIDs] = useState<string[]>(
    Object.keys(preconfiguredParentFields)
  );

  const [isChildPopoverOpen, setIsChildPopoverOpen] = useState(false);
  const [childControlGroupAPI, setchildControlGroupAPI] = useState<ControlGroupContainer>();
  const [availableChildUUIDs, setAvailableChildUUIDs] = useState<string[]>(
    Object.keys(preconfiguredChildFields)
  );

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

    const subscription = parentControlGroupAPI.onControlRemoved$.subscribe((idRemoved) => {
      setAvailableParentUUIDs((currentAvailableUUIDs) => [...currentAvailableUUIDs, idRemoved]);
    });
    subscription.add(
      childControlGroupAPI.onControlRemoved$.subscribe((idRemoved) => {
        setAvailableChildUUIDs((currentAvailableUUIDs) => [...currentAvailableUUIDs, idRemoved]);
      })
    );
    subscription.add(
      parentControlGroupAPI.onFiltersPublished$.subscribe((parentOutputFilters) =>
        childControlGroupAPI.updateFilterContext(parentOutputFilters)
      )
    );
    return () => subscription?.unsubscribe();
  }, [parentControlGroupAPI, childControlGroupAPI]);

  const addControlToParentButton = (
    <EuiButton
      disabled={availableParentUUIDs.length === 0}
      onClick={() => setIsParentPopoverOpen(true)}
      iconType="arrowDown"
      iconSide="right"
    >
      Add a pre-configured control
    </EuiButton>
  );

  const addControlToChildButton = (
    <EuiButton
      disabled={availableChildUUIDs.length === 0}
      onClick={() => setIsChildPopoverOpen(true)}
      iconType="arrowDown"
      iconSide="right"
    >
      Add a pre-configured control
    </EuiButton>
  );

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Control Group Embeddable Imperative API Example</h1>
          </EuiTitle>
          <EuiButton
            onClick={() =>
              setViewMode((currentViewMode) => {
                return currentViewMode === ViewMode.VIEW ? ViewMode.EDIT : ViewMode.VIEW;
              })
            }
          >
            Switch to {viewMode === ViewMode.VIEW ? 'edit mode' : 'view mode'}
          </EuiButton>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
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
                <EuiPopover
                  id={'addControlPopover'}
                  button={addControlToParentButton}
                  isOpen={isParentPopoverOpen}
                  closePopover={() => setIsParentPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={mapFieldsToControlOptions(
                      availableParentUUIDs,
                      preconfiguredParentFields,
                      parentControlGroupAPI!,
                      setIsParentPopoverOpen,
                      setAvailableParentUUIDs,
                      dataViewId
                    )}
                  />
                </EuiPopover>
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
                <EuiPopover
                  id={'addControlToChildPopover'}
                  button={addControlToChildButton}
                  isOpen={isChildPopoverOpen}
                  closePopover={() => setIsChildPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenu
                    initialPanelId={0}
                    panels={mapFieldsToControlOptions(
                      availableChildUUIDs,
                      preconfiguredChildFields,
                      childControlGroupAPI!,
                      setIsChildPopoverOpen,
                      setAvailableChildUUIDs,
                      dataViewId
                    )}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
};
