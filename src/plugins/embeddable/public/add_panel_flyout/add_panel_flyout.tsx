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

import { PresentationContainer } from '@kbn/presentation-containers';
import {
  core,
  embeddableStart,
  savedObjectsTaggingOss,
  contentManagement,
} from '../kibana_services';
import { savedObjectToPanel } from '../registry/saved_object_to_panel_methods';
import {
  getReactEmbeddableSavedObjects,
  ReactEmbeddableSavedObject,
} from '../lib/embeddable_saved_object_registry/embeddable_saved_object_registry';
import { EmbeddableFactory, EmbeddableFactoryNotFoundError } from '../lib';

type LegacyFactoryMap = { [key: string]: EmbeddableFactory };
type FactoryMap<TSavedObjectAttributes extends FinderAttributes = FinderAttributes> = {
  [key: string]: ReactEmbeddableSavedObject<TSavedObjectAttributes> & { type?: string };
};

export const AddPanelFlyout = ({ container }: { container: PresentationContainer }) => {
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
        .map(({ savedObjectMetaData }) => savedObjectMetaData as SavedObjectMetaData)
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
        const { method } = factory;
        method(container, savedObject);
        return;
      }

      const legacyFactoryForSavedObjectType = legacyFactoriesBySavedObjectType[type];
      if (!legacyFactoryForSavedObjectType) {
        throw new EmbeddableFactoryNotFoundError(type);
      }

      const initialState = savedObjectToPanel[type](savedObject) ?? { savedObjectId: id };

      container.addNewPanel({
        panelType: legacyFactoryForSavedObjectType.type,
        initialState,
      });

      // TODO figure out a way to pass a factory subtype to container.trackPanelAddMetric
    },
    [container, factoriesBySavedObjectType, legacyFactoriesBySavedObjectType]
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
