/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { FinderAttributes, SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import {
  SavedObjectFinder,
  SavedObjectFinderProps,
  type SavedObjectMetaData,
} from '@kbn/saved-objects-finder-plugin/public';

import { METRIC_TYPE } from '@kbn/analytics';
import { apiHasType } from '@kbn/presentation-publishing';
import { Toast } from '@kbn/core/public';
import {
  core,
  embeddableStart,
  savedObjectsTaggingOss,
  contentManagement,
  usageCollection,
} from '../kibana_services';
import { savedObjectToPanel } from '../registry/saved_object_to_panel_methods';
import {
  ReactEmbeddableSavedObject,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  SavedObjectEmbeddableInput,
  getReactEmbeddableSavedObjects,
  Container,
} from '../lib';

type LegacyFactoryMap = { [key: string]: EmbeddableFactory };
type FactoryMap<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = {
  [key: string]: ReactEmbeddableSavedObject<TSavedObjectAttributes> & { type: string };
};

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
  parent: unknown,
  factoryType: string,
  savedObject: SavedObjectCommon,
  savedObjectMetaData?: SavedObjectMetaData
) => {
  if (!apiHasType(parent)) return;
  const type = savedObjectMetaData?.getSavedObjectSubType
    ? savedObjectMetaData.getSavedObjectSubType(savedObject)
    : factoryType;

  usageCollection?.reportUiCounter?.(parent.type, METRIC_TYPE.CLICK, `${type}:add`);
};

export const AddPanelFlyout = ({
  container,
  onAddPanel,
}: {
  container: Container;
  onAddPanel?: (id: string) => void;
}) => {
  const legacyFactoriesBySavedObjectType: LegacyFactoryMap = useMemo(() => {
    return [...embeddableStart.getEmbeddableFactories()]
      .filter(
        (embeddableFactory) =>
          Boolean(embeddableFactory.savedObjectMetaData?.type) && !embeddableFactory.isContainerType
      )
      .reduce((acc, factory) => {
        acc[factory.savedObjectMetaData!.type] = factory;
        return acc;
      }, {} as LegacyFactoryMap);
  }, []);

  const factoriesBySavedObjectType: FactoryMap = useMemo(() => {
    return [...getReactEmbeddableSavedObjects()]
      .filter(([type, embeddableFactory]) => {
        return Boolean(embeddableFactory.savedObjectMetaData?.type);
      })
      .reduce((acc, [type, factory]) => {
        acc[factory.savedObjectMetaData!.type] = {
          ...factory,
          type,
        };
        return acc;
      }, {} as FactoryMap);
  }, []);

  const metaData = useMemo(
    () =>
      [
        ...Object.values(factoriesBySavedObjectType),
        ...Object.values(legacyFactoriesBySavedObjectType),
      ]
        .filter((embeddableFactory) => Boolean(embeddableFactory.savedObjectMetaData))
        .map(({ savedObjectMetaData }) => savedObjectMetaData!)
        .sort((a, b) => a.type.localeCompare(b.type)),
    [factoriesBySavedObjectType, legacyFactoriesBySavedObjectType]
  );

  const onChoose: SavedObjectFinderProps['onChoose'] = useCallback(
    async (
      id: SavedObjectCommon['id'],
      type: SavedObjectCommon['type'],
      name: string,
      savedObject: SavedObjectCommon
    ) => {
      if (factoriesBySavedObjectType[type]) {
        const factory = factoriesBySavedObjectType[type];
        const { onAdd, savedObjectMetaData } = factory;

        onAdd(container, savedObject);
        runAddTelemetry(container, factory.type, savedObject, savedObjectMetaData);
        return;
      }

      const legacyFactoryForSavedObjectType = legacyFactoriesBySavedObjectType[type];
      if (!legacyFactoryForSavedObjectType) {
        throw new EmbeddableFactoryNotFoundError(type);
      }

      let embeddableId: string;

      if (savedObjectToPanel[type]) {
        // this panel type has a custom method for converting saved objects to panels
        const panel = savedObjectToPanel[type](savedObject);

        const { id: _embeddableId } = await container.addNewEmbeddable(
          legacyFactoryForSavedObjectType.type,
          panel,
          savedObject.attributes
        );

        embeddableId = _embeddableId;
      } else {
        const { id: _embeddableId } = await container.addNewEmbeddable<SavedObjectEmbeddableInput>(
          legacyFactoryForSavedObjectType.type,
          { savedObjectId: id },
          savedObject.attributes
        );

        embeddableId = _embeddableId;
      }

      onAddPanel?.(embeddableId);

      showSuccessToast(name);
      const { savedObjectMetaData, type: factoryType } = legacyFactoryForSavedObjectType;
      runAddTelemetry(container, factoryType, savedObject, savedObjectMetaData);
    },
    [container, factoriesBySavedObjectType, legacyFactoriesBySavedObjectType, onAddPanel]
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
