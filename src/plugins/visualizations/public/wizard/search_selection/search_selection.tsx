/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { IUiSettingsClient } from '@kbn/core/public';
import type { BaseVisType } from '../../vis_types';
import { DialogNavigation } from '../dialog_navigation';
import { showSavedObject } from './show_saved_object';

interface SearchSelectionProps {
  contentClient: ContentClient;
  uiSettings: IUiSettingsClient;
  onSearchSelected: (searchId: string, searchType: string) => void;
  visType: BaseVisType;
  goBack: () => void;
}

export class SearchSelection extends React.Component<SearchSelectionProps> {
  private fixedPageSize: number = 8;
  public render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="visualizations.newVisWizard.newVisTypeTitle"
              defaultMessage="New {visTypeName}"
              values={{ visTypeName: this.props.visType.title }}
            />{' '}
            /{' '}
            <FormattedMessage
              id="visualizations.newVisWizard.chooseSourceTitle"
              defaultMessage="Choose a source"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <DialogNavigation goBack={this.props.goBack} />
          <SavedObjectFinder
            key="searchSavedObjectFinder"
            id="visSearchSelection"
            onChoose={this.props.onSearchSelected}
            showFilter
            noItemsMessage={i18n.translate(
              'visualizations.newVisWizard.searchSelection.notFoundLabel',
              {
                defaultMessage: 'No matching indices or Discover Sessions found.',
              }
            )}
            savedObjectMetaData={[
              {
                type: 'search',
                getIconForSavedObject: () => 'discoverApp',
                name: i18n.translate(
                  'visualizations.newVisWizard.searchSelection.savedObjectType.search',
                  {
                    defaultMessage: 'Discover Session',
                  }
                ),
                // ignore the saved searches that have text-based languages queries
                includeFields: ['isTextBasedQuery', 'usesAdHocDataView'],
                showSavedObject,
              },
              {
                type: 'index-pattern',
                getIconForSavedObject: () => 'indexPatternApp',
                name: i18n.translate(
                  'visualizations.newVisWizard.searchSelection.savedObjectType.dataView',
                  {
                    defaultMessage: 'Data view',
                  }
                ),
              },
            ]}
            fixedPageSize={this.fixedPageSize}
            services={{
              contentClient: this.props.contentClient,
              uiSettings: this.props.uiSettings,
            }}
          />
        </EuiModalBody>
      </React.Fragment>
    );
  }
}
