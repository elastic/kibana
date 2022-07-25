/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { IUiSettingsClient, SavedObjectsStart } from '@kbn/core/public';

import { SavedObjectFinderUi } from '@kbn/saved-objects-plugin/public';
import type { BaseVisType } from '../../vis_types';
import { DialogNavigation } from '../dialog_navigation';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  visType: BaseVisType;
  uiSettings: IUiSettingsClient;
  savedObjects: SavedObjectsStart;
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
          <SavedObjectFinderUi
            key="searchSavedObjectFinder"
            onChoose={this.props.onSearchSelected}
            showFilter
            noItemsMessage={i18n.translate(
              'visualizations.newVisWizard.searchSelection.notFoundLabel',
              {
                defaultMessage: 'No matching indices or saved searches found.',
              }
            )}
            savedObjectMetaData={[
              {
                type: 'search',
                getIconForSavedObject: () => 'search',
                name: i18n.translate(
                  'visualizations.newVisWizard.searchSelection.savedObjectType.search',
                  {
                    defaultMessage: 'Saved search',
                  }
                ),
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
            uiSettings={this.props.uiSettings}
            savedObjects={this.props.savedObjects}
          />
        </EuiModalBody>
      </React.Fragment>
    );
  }
}
