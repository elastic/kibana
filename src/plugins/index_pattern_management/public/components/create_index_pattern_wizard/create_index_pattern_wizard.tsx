/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { ReactElement, Component } from 'react';

import { EuiGlobalToastList, EuiGlobalToastListToast, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import {
  SavedObjectsClientContract,
  IUiSettingsClient,
  OverlayStart,
  ChromeDocTitle,
  IBasePath,
} from 'src/core/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { ManagementAppMountParams } from '../../../../management/public';
import { StepIndexPattern } from './components/step_index_pattern';
import { StepTimeField } from './components/step_time_field';
import { Header } from './components/header';
import { LoadingState } from './components/loading_state';
import { EmptyState } from './components/empty_state';

import { getCreateBreadcrumbs } from '../breadcrumbs';
import { MAX_SEARCH_SIZE } from './constants';
import { ensureMinimumTime, getIndices } from './lib';
import { IndexPatternCreationConfig, IndexPatternManagementStart } from '../..';
import { MatchedIndex } from './types';

export interface CreateIndexPatternWizardProps extends RouteComponentProps {
  services: {
    indexPatternCreation: IndexPatternManagementStart['creation'];
    es: DataPublicPluginStart['search']['__LEGACY']['esClient'];
    indexPatterns: DataPublicPluginStart['indexPatterns'];
    savedObjectsClient: SavedObjectsClientContract;
    uiSettings: IUiSettingsClient;
    openConfirm: OverlayStart['openConfirm'];
    setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
    docTitle: ChromeDocTitle;
    prependBasePath: IBasePath['prepend'];
  };
}

interface CreateIndexPatternWizardState {
  step: number;
  indexPattern: string;
  allIndices: MatchedIndex[];
  remoteClustersExist: boolean;
  isInitiallyLoadingIndices: boolean;
  isIncludingSystemIndices: boolean;
  toasts: EuiGlobalToastListToast[];
  indexPatternCreationType: IndexPatternCreationConfig;
}

export class CreateIndexPatternWizard extends Component<
  CreateIndexPatternWizardProps,
  CreateIndexPatternWizardState
> {
  constructor(props: CreateIndexPatternWizardProps) {
    super(props);
    const {
      services: { indexPatternCreation, setBreadcrumbs },
      location,
    } = props;

    setBreadcrumbs(getCreateBreadcrumbs());

    const type = new URLSearchParams(location.search).get('type') || undefined;

    this.state = {
      step: 1,
      indexPattern: '',
      allIndices: [],
      remoteClustersExist: false,
      isInitiallyLoadingIndices: true,
      isIncludingSystemIndices: false,
      toasts: [],
      indexPatternCreationType: indexPatternCreation.getType(type),
    };
  }

  async UNSAFE_componentWillMount() {
    this.fetchData();
  }

  catchAndWarn = async (
    asyncFn: Promise<MatchedIndex[]>,
    errorValue: [] | string[],
    errorMsg: ReactElement
  ) => {
    try {
      return await asyncFn;
    } catch (errors) {
      this.setState(prevState => ({
        toasts: prevState.toasts.concat([
          {
            title: errorMsg,
            id: errorMsg.props.id,
            color: 'warning',
            iconType: 'alert',
          },
        ]),
      }));
      return errorValue;
    }
  };

  fetchData = async () => {
    const { services } = this.props;

    this.setState({
      allIndices: [],
      isInitiallyLoadingIndices: true,
      remoteClustersExist: false,
    });

    const indicesFailMsg = (
      <FormattedMessage
        id="indexPatternManagement.createIndexPattern.loadIndicesFailMsg"
        defaultMessage="Failed to load indices"
      />
    );

    const clustersFailMsg = (
      <FormattedMessage
        id="indexPatternManagement.createIndexPattern.loadClustersFailMsg"
        defaultMessage="Failed to load remote clusters"
      />
    );

    // query local and remote indices, updating state independently
    ensureMinimumTime(
      this.catchAndWarn(
        getIndices(services.es, this.state.indexPatternCreationType, `*`, MAX_SEARCH_SIZE),
        [],
        indicesFailMsg
      )
    ).then((allIndices: MatchedIndex[]) =>
      this.setState({ allIndices, isInitiallyLoadingIndices: false })
    );

    this.catchAndWarn(
      // if we get an error from remote cluster query, supply fallback value that allows user entry.
      // ['a'] is fallback value
      getIndices(services.es, this.state.indexPatternCreationType, `*:*`, 1),
      ['a'],
      clustersFailMsg
    ).then((remoteIndices: string[] | MatchedIndex[]) =>
      this.setState({ remoteClustersExist: !!remoteIndices.length })
    );
  };

  createIndexPattern = async (timeFieldName: string | undefined, indexPatternId: string) => {
    const { services, history } = this.props;
    const { indexPattern } = this.state;

    const emptyPattern = await services.indexPatterns.make();

    Object.assign(emptyPattern, {
      id: indexPatternId,
      title: indexPattern,
      timeFieldName,
      ...this.state.indexPatternCreationType.getIndexPatternMappings(),
    });

    const createdId = await emptyPattern.create();
    if (!createdId) {
      const confirmMessage = i18n.translate(
        'indexPatternManagement.indexPattern.titleExistsLabel',
        {
          values: { title: emptyPattern.title },
          defaultMessage: "An index pattern with the title '{title}' already exists.",
        }
      );

      const isConfirmed = await services.openConfirm(confirmMessage, {
        confirmButtonText: i18n.translate(
          'indexPatternManagement.indexPattern.goToPatternButtonLabel',
          {
            defaultMessage: 'Go to existing pattern',
          }
        ),
      });

      if (isConfirmed) {
        return history.push(`/patterns/${indexPatternId}`);
      } else {
        return false;
      }
    }

    if (!services.uiSettings.get('defaultIndex')) {
      await services.uiSettings.set('defaultIndex', createdId);
    }

    services.indexPatterns.clearCache(createdId);
    history.push(`/patterns/${createdId}`);
  };

  goToTimeFieldStep = (indexPattern: string) => {
    this.setState({ step: 2, indexPattern });
  };

  goToIndexPatternStep = () => {
    this.setState({ step: 1 });
  };

  onChangeIncludingSystemIndices = () => {
    this.setState(prevState => ({
      isIncludingSystemIndices: !prevState.isIncludingSystemIndices,
    }));
  };

  renderHeader() {
    const { isIncludingSystemIndices } = this.state;
    const { services } = this.props;

    return (
      <Header
        prompt={this.state.indexPatternCreationType.renderPrompt()}
        showSystemIndices={this.state.indexPatternCreationType.getShowSystemIndices()}
        isIncludingSystemIndices={isIncludingSystemIndices}
        onChangeIncludingSystemIndices={this.onChangeIncludingSystemIndices}
        indexPatternName={this.state.indexPatternCreationType.getIndexPatternName()}
        isBeta={this.state.indexPatternCreationType.getIsBeta()}
        changeTitle={services.docTitle.change}
      />
    );
  }

  renderContent() {
    const {
      allIndices,
      isInitiallyLoadingIndices,
      isIncludingSystemIndices,
      step,
      indexPattern,
      remoteClustersExist,
    } = this.state;

    if (isInitiallyLoadingIndices) {
      return <LoadingState />;
    }

    const hasDataIndices = allIndices.some(({ name }: MatchedIndex) => !name.startsWith('.'));
    if (!hasDataIndices && !isIncludingSystemIndices && !remoteClustersExist) {
      return (
        <EmptyState
          onRefresh={this.fetchData}
          prependBasePath={this.props.services.prependBasePath}
        />
      );
    }

    if (step === 1) {
      const { services, location } = this.props;
      const initialQuery = new URLSearchParams(location.search).get('id') || undefined;

      return (
        <StepIndexPattern
          allIndices={allIndices}
          initialQuery={indexPattern || initialQuery}
          isIncludingSystemIndices={isIncludingSystemIndices}
          esService={services.es}
          savedObjectsClient={services.savedObjectsClient}
          indexPatternCreationType={this.state.indexPatternCreationType}
          goToNextStep={this.goToTimeFieldStep}
          uiSettings={services.uiSettings}
        />
      );
    }

    if (step === 2) {
      const { services } = this.props;
      return (
        <StepTimeField
          indexPattern={indexPattern}
          indexPatternsService={services.indexPatterns}
          goToPreviousStep={this.goToIndexPatternStep}
          createIndexPattern={this.createIndexPattern}
          indexPatternCreationType={this.state.indexPatternCreationType}
        />
      );
    }

    return null;
  }

  removeToast = (id: string) => {
    this.setState(prevState => ({
      toasts: prevState.toasts.filter(toast => toast.id !== id),
    }));
  };

  render() {
    const header = this.renderHeader();
    const content = this.renderContent();

    return (
      <EuiPanel paddingSize={'l'}>
        <div>
          {header}
          {content}
        </div>
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={({ id }) => {
            this.removeToast(id);
          }}
          toastLifeTimeMs={6000}
        />
      </EuiPanel>
    );
  }
}

export const CreateIndexPatternWizardWithRouter = withRouter(CreateIndexPatternWizard);
