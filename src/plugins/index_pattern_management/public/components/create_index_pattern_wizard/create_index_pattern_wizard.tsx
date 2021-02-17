/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, Component } from 'react';

import {
  EuiGlobalToastList,
  EuiGlobalToastListToast,
  EuiPageContent,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { DocLinksStart } from 'src/core/public';
import { StepIndexPattern } from './components/step_index_pattern';
import { StepTimeField } from './components/step_time_field';
import { Header } from './components/header';
import { LoadingState } from './components/loading_state';

import { context as contextType } from '../../../../kibana_react/public';
import { getCreateBreadcrumbs } from '../breadcrumbs';
import { ensureMinimumTime, getIndices } from './lib';
import { IndexPatternCreationConfig } from '../..';
import { IndexPatternManagmentContextValue } from '../../types';
import { MatchedItem } from './types';
import { DuplicateIndexPatternError, IndexPattern } from '../../../../data/public';

interface CreateIndexPatternWizardState {
  step: number;
  indexPattern: string;
  allIndices: MatchedItem[];
  remoteClustersExist: boolean;
  isInitiallyLoadingIndices: boolean;
  toasts: EuiGlobalToastListToast[];
  indexPatternCreationType: IndexPatternCreationConfig;
  selectedTimeField?: string;
  docLinks: DocLinksStart;
}

export class CreateIndexPatternWizard extends Component<
  RouteComponentProps,
  CreateIndexPatternWizardState
> {
  static contextType = contextType;

  public readonly context!: IndexPatternManagmentContextValue;

  constructor(props: RouteComponentProps, context: IndexPatternManagmentContextValue) {
    super(props, context);

    context.services.setBreadcrumbs(getCreateBreadcrumbs());

    const type = new URLSearchParams(props.location.search).get('type') || undefined;

    this.state = {
      step: 1,
      indexPattern: '',
      allIndices: [],
      remoteClustersExist: false,
      isInitiallyLoadingIndices: true,
      toasts: [],
      indexPatternCreationType: context.services.indexPatternManagementStart.creation.getType(type),
      docLinks: context.services.docLinks,
    };
  }

  async UNSAFE_componentWillMount() {
    this.fetchData();
  }

  catchAndWarn = async (
    asyncFn: Promise<MatchedItem[]>,
    errorValue: [] | string[],
    errorMsg: ReactElement
  ) => {
    try {
      return await asyncFn;
    } catch (errors) {
      this.setState((prevState) => ({
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
        getIndices(
          this.context.services.http,
          (indexName: string) => this.state.indexPatternCreationType.getIndexTags(indexName),
          `*`,
          false
        ),

        [],
        indicesFailMsg
      )
    ).then((allIndices: MatchedItem[]) =>
      this.setState({ allIndices, isInitiallyLoadingIndices: false })
    );

    this.catchAndWarn(
      // if we get an error from remote cluster query, supply fallback value that allows user entry.
      // ['a'] is fallback value
      getIndices(
        this.context.services.http,
        (indexName: string) => this.state.indexPatternCreationType.getIndexTags(indexName),
        `*:*`,
        false
      ),

      ['a'],
      clustersFailMsg
    ).then((remoteIndices: string[] | MatchedItem[]) =>
      this.setState({ remoteClustersExist: !!remoteIndices.length })
    );
  };

  createIndexPattern = async (timeFieldName: string | undefined, indexPatternId: string) => {
    let emptyPattern: IndexPattern;
    const { history } = this.props;
    const { indexPattern } = this.state;

    try {
      emptyPattern = await this.context.services.data.indexPatterns.createAndSave({
        id: indexPatternId,
        title: indexPattern,
        timeFieldName,
        ...this.state.indexPatternCreationType.getIndexPatternMappings(),
      });
    } catch (err) {
      if (err instanceof DuplicateIndexPatternError) {
        const confirmMessage = i18n.translate(
          'indexPatternManagement.indexPattern.titleExistsLabel',
          {
            values: { title: emptyPattern!.title },
            defaultMessage: "An index pattern with the title '{title}' already exists.",
          }
        );

        const isConfirmed = await this.context.services.overlays.openConfirm(confirmMessage, {
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
          return;
        }
      } else {
        throw err;
      }
    }

    await this.context.services.data.indexPatterns.setDefault(emptyPattern.id as string);

    this.context.services.data.indexPatterns.clearCache(emptyPattern.id as string);
    history.push(`/patterns/${emptyPattern.id}`);
  };

  goToTimeFieldStep = (indexPattern: string, selectedTimeField?: string) => {
    this.setState({ step: 2, indexPattern, selectedTimeField });
  };

  goToIndexPatternStep = () => {
    this.setState({ step: 1 });
  };

  renderHeader() {
    const { docLinks, indexPatternCreationType } = this.state;
    return (
      <Header
        prompt={indexPatternCreationType.renderPrompt()}
        indexPatternName={indexPatternCreationType.getIndexPatternName()}
        isBeta={indexPatternCreationType.getIsBeta()}
        docLinks={docLinks}
      />
    );
  }

  renderContent() {
    const { allIndices, isInitiallyLoadingIndices, step, indexPattern } = this.state;

    if (isInitiallyLoadingIndices) {
      return <LoadingState />;
    }

    const header = this.renderHeader();

    if (step === 1) {
      const { location } = this.props;
      const initialQuery = new URLSearchParams(location.search).get('id') || undefined;

      return (
        <EuiPageContent>
          {header}
          <EuiHorizontalRule />
          <StepIndexPattern
            allIndices={allIndices}
            initialQuery={indexPattern || initialQuery}
            indexPatternCreationType={this.state.indexPatternCreationType}
            goToNextStep={this.goToTimeFieldStep}
            showSystemIndices={
              this.state.indexPatternCreationType.getShowSystemIndices() && this.state.step === 1
            }
          />
        </EuiPageContent>
      );
    }

    if (step === 2) {
      return (
        <EuiPageContent>
          {header}
          <EuiHorizontalRule />
          <StepTimeField
            indexPattern={indexPattern}
            goToPreviousStep={this.goToIndexPatternStep}
            createIndexPattern={this.createIndexPattern}
            indexPatternCreationType={this.state.indexPatternCreationType}
            selectedTimeField={this.state.selectedTimeField}
          />
        </EuiPageContent>
      );
    }

    return null;
  }

  removeToast = (id: string) => {
    this.setState((prevState) => ({
      toasts: prevState.toasts.filter((toast) => toast.id !== id),
    }));
  };

  render() {
    const content = this.renderContent();

    return (
      <>
        {content}
        <EuiGlobalToastList
          toasts={this.state.toasts}
          dismissToast={({ id }) => {
            this.removeToast(id);
          }}
          toastLifeTimeMs={6000}
        />
      </>
    );
  }
}

export const CreateIndexPatternWizardWithRouter = withRouter(CreateIndexPatternWizard);
