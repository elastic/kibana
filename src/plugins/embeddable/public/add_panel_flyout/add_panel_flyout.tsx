/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { Toast } from '@kbn/core/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import {
  SavedObjectFinder,
  SavedObjectFinderProps,
  type SavedObjectMetaData,
} from '@kbn/saved-objects-finder-plugin/public';

import {
  core,
  embeddableStart,
  usageCollection,
  savedObjectsTaggingOss,
  contentManagement,
} from '../kibana_services';
import {
  IContainer,
  EmbeddableFactory,
  SavedObjectEmbeddableInput,
  EmbeddableFactoryNotFoundError,
} from '../lib';
import { savedObjectToPanel } from '../registry/saved_object_to_panel_methods';

type FactoryMap = { [key: string]: EmbeddableFactory };

let lastToast: string | Toast;
const showSuccessToast = (name: string) => {
  if (lastToast) core.notifications.toasts.remove(lastToast);

  lastToast = core.notifications.toasts.addSuccess({
    title: i18n.translate('embeddableApi.addPanel.savedObjectAddedToContainerSuccessMessageTitle', {
      defaultMessage: '{savedObjectName} was added',
      values: {
        savedObjectName: name,
      },
    }),
    'data-test-subj': 'addObjectToContainerSuccess',
  });
};

const runAddTelemetry = (
  parentType: string,
  factory: EmbeddableFactory,
  savedObject: SavedObjectCommon
) => {
  const type = factory.savedObjectMetaData?.getSavedObjectSubType
    ? factory.savedObjectMetaData.getSavedObjectSubType(savedObject)
    : factory.type;

  usageCollection?.reportUiCounter?.(parentType, METRIC_TYPE.CLICK, `${type}:add`);
};

export const AddPanelFlyout = ({
  container,
  onAddPanel,
}: {
  container: IContainer;
  onAddPanel?: (id: string) => void;
}) => {
  const factoriesBySavedObjectType: FactoryMap = useMemo(() => {
    return [...embeddableStart.getEmbeddableFactories()]
      .filter((embeddableFactory) => Boolean(embeddableFactory.savedObjectMetaData?.type))
      .reduce((acc, factory) => {
        acc[factory.savedObjectMetaData!.type] = factory;
        return acc;
      }, {} as FactoryMap);
  }, []);

  const metaData = useMemo(
    () =>
      Object.values(factoriesBySavedObjectType)
        .filter(
          (embeddableFactory) =>
            Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
        )
        .map(({ savedObjectMetaData }) => savedObjectMetaData as SavedObjectMetaData),
    [factoriesBySavedObjectType]
  );

  const onChoose: SavedObjectFinderProps['onChoose'] = useCallback(
    async (
      id: SavedObjectCommon['id'],
      type: SavedObjectCommon['type'],
      name: string,
      savedObject: SavedObjectCommon
    ) => {
      const factoryForSavedObjectType = factoriesBySavedObjectType[type];
      if (!factoryForSavedObjectType) {
        throw new EmbeddableFactoryNotFoundError(type);
      }

      let embeddableId: string;

      if (savedObjectToPanel[type]) {
        // this panel type has a custom method for converting saved objects to panels
        const panel = savedObjectToPanel[type](savedObject);

        const { id: _embeddableId } = await container.addNewEmbeddable(
          factoryForSavedObjectType.type,
          panel,
          savedObject.attributes
        );

        embeddableId = _embeddableId;
      } else {
        const { id: _embeddableId } = await container.addNewEmbeddable<SavedObjectEmbeddableInput>(
          factoryForSavedObjectType.type,
          { savedObjectId: id },
          savedObject.attributes
        );

        embeddableId = _embeddableId;
      }

      onAddPanel?.(embeddableId);

      showSuccessToast(name);
      runAddTelemetry(container.type, factoryForSavedObjectType, savedObject);
    },
    [container, factoriesBySavedObjectType, onAddPanel]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('embeddableApi.addPanel.Title', { defaultMessage: 'Add from library' })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SavedObjectFinder
          services={{
            contentClient: contentManagement.client,
            savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
            uiSettings: core.uiSettings,
          }}
          onChoose={onChoose}
          savedObjectMetaData={metaData}
          showFilter={true}
          noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
            defaultMessage: 'No matching objects found.',
          })}
          getTooltipText={(item) => {
            return item.managed
              ? i18n.translate('embeddableApi.addPanel.managedPanelTooltip', {
                  defaultMessage:
                    'Elastic manages this panel. Adding it to a dashboard unlinks it from the library.',
                })
              : undefined;
          }}
        />
      </EuiFlyoutBody>
    </>
  );
};
