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
import type { SimpleSavedObject, SavedObjectAttributes } from '@kbn/core/public';
import React from 'react';

import { BaseSavedObjectFinderProps } from '@kbn/saved-objects-finder-plugin/public';
import type { BaseVisType } from '../../vis_types';
import { DialogNavigation } from '../dialog_navigation';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  visType: BaseVisType;
  goBack: () => void;
  SavedObjectFinder: (props: BaseSavedObjectFinderProps) => JSX.Element;
}
interface SavedSearchesAttributes extends SavedObjectAttributes {
  isTextBasedQuery: boolean;
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
          <this.props.SavedObjectFinder
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
                // ignore the saved searches that have text-based languages queries
                includeFields: ['isTextBasedQuery'],
                showSavedObject: (savedObject) => {
                  const so = savedObject as unknown as SimpleSavedObject<SavedSearchesAttributes>;
                  return !so.attributes.isTextBasedQuery;
                },
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
                defaultSearchField: 'name',
              },
            ]}
            fixedPageSize={this.fixedPageSize}
          />
        </EuiModalBody>
      </React.Fragment>
    );
  }
}
