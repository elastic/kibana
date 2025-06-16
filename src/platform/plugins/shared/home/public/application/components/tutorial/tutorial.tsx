/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiPanel, EuiButton, EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { injectI18n, FormattedMessage, InjectedIntl } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type {
  TutorialType,
  InstructionSetType,
  StatusCheckType,
  InstructionsType,
} from '../../../services/tutorials/types';
import { TutorialsCategory as TutorialCategoryType } from '../../../../common/constants';
import type { CustomStatusCheckCallback } from '../../../services/tutorials/tutorial_service';
import { Footer } from './footer';
import { Introduction } from './introduction';
import { InstructionSet } from './instruction_set';
import * as StatusCheckStates from './status_check_states';
import { getServices, HomeKibanaServices } from '../../kibana_services';

const INSTRUCTIONS_TYPE = {
  ELASTIC_CLOUD: 'elasticCloud',
  ON_PREM: 'onPrem',
  ON_PREM_ELASTIC_CLOUD: 'onPremElasticCloud',
} as const;

const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

interface TutorialProps {
  addBasePath: HomeKibanaServices['addBasePath'];
  isCloudEnabled: boolean;
  getTutorial: (id: string) => Promise<TutorialType>;
  replaceTemplateStrings: (text: string) => string;
  tutorialId: string;
  intl: InjectedIntl;
}

type StatusCheckStatesType = 'HAS_DATA' | 'NO_DATA' | 'ERROR' | 'NOT_CHECKED' | 'FETCHING';

interface TutorialState {
  notFound: boolean;
  statusCheckStates: StatusCheckStatesType[];
  tutorial: TutorialType | null;
  visibleInstructions: string;
}

class TutorialUi extends React.Component<TutorialProps, TutorialState> {
  private _isMounted: boolean;

  constructor(props: TutorialProps) {
    super(props);

    this.state = {
      notFound: false,
      statusCheckStates: [],
      tutorial: null,
      visibleInstructions: props.isCloudEnabled
        ? INSTRUCTIONS_TYPE.ELASTIC_CLOUD
        : INSTRUCTIONS_TYPE.ON_PREM,
    };

    this._isMounted = false;
  }

  UNSAFE_componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    const tutorial: TutorialType = await this.props.getTutorial(this.props.tutorialId);
    if (!this._isMounted) {
      return;
    }

    if (tutorial) {
      this.setState({ tutorial }, this.initInstructionsState);
    } else {
      this.setState({ notFound: true });
    }

    const breadcrumbs = [
      {
        text: integrationsTitle,
        href: this.props.addBasePath('/app/integrations/browse'),
      },
      {
        text: tutorial ? tutorial.name : this.props.tutorialId,
      },
    ];
    getServices().chrome.setBreadcrumbs(breadcrumbs, {
      project: {
        value: breadcrumbs,
      },
    });
  }

  getInstructions = () => {
    if (!this.state.tutorial) {
      return { instructionSets: [] };
    }

    switch (this.state.visibleInstructions) {
      case INSTRUCTIONS_TYPE.ELASTIC_CLOUD:
        return this.state.tutorial.elasticCloud;
      case INSTRUCTIONS_TYPE.ON_PREM:
        return this.state.tutorial.onPrem;
      case INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD:
        return this.state.tutorial.onPremElasticCloud;
      default:
        throw new Error(
          this.props.intl.formatMessage(
            {
              id: 'home.tutorial.unhandledInstructionTypeErrorDescription',
              defaultMessage: 'Unhandled instruction type {visibleInstructions}',
            },
            {
              visibleInstructions: this.state.visibleInstructions,
            }
          )
        );
    }
  };

  getInstructionSets = (): InstructionSetType[] => {
    return this.getInstructions()?.instructionSets ?? [];
  };

  initInstructionsState = () => {
    const instructions: InstructionsType = this.getInstructions() || { instructionSets: [] };

    const statusCheckStates = new Array(instructions?.instructionSets?.length ?? 0).fill(
      StatusCheckStates.NOT_CHECKED
    );

    this.setState({
      statusCheckStates,
    });
  };

  setVisibleInstructions = (instructionsType: TutorialState['visibleInstructions']) => {
    this.setState(
      {
        visibleInstructions: instructionsType,
      },
      this.initInstructionsState
    );
  };

  checkInstructionSetStatus = async (instructionSetIndex: number) => {
    const instructionSets = this.getInstructionSets();
    if (!instructionSets) return;

    const instructionSet = instructionSets[instructionSetIndex];
    if (!instructionSet) return;

    const esHitsCheckConfig = instructionSet.statusCheck?.esHitsCheck;
    if (!this.state.tutorial) return;

    const customStatusCheckCallback = this.state.tutorial.customStatusCheckName
      ? getServices().tutorialService.getCustomStatusCheck(
          this.state.tutorial.customStatusCheckName
        )
      : undefined;

    const [esHitsStatusCheck, customStatusCheck] = await Promise.all([
      ...(esHitsCheckConfig ? [this.fetchEsHitsStatus(esHitsCheckConfig)] : []),
      ...(customStatusCheckCallback
        ? [this.fetchCustomStatusCheck(customStatusCheckCallback)]
        : []),
    ]);

    const nextStatusCheckState: StatusCheckStatesType =
      esHitsStatusCheck === StatusCheckStates.HAS_DATA ||
      customStatusCheck === StatusCheckStates.HAS_DATA
        ? StatusCheckStates.HAS_DATA
        : StatusCheckStates.NO_DATA;

    this.setState((prevState) => {
      const newStatusCheckStates = [...prevState.statusCheckStates];
      newStatusCheckStates[instructionSetIndex] = nextStatusCheckState;
      return {
        statusCheckStates: newStatusCheckStates,
      };
    });
  };

  fetchCustomStatusCheck = async (customStatusCheckCallback: CustomStatusCheckCallback) => {
    try {
      const response = await customStatusCheckCallback();
      return response ? StatusCheckStates.HAS_DATA : StatusCheckStates.NO_DATA;
    } catch (e) {
      return StatusCheckStates.ERROR;
    }
  };

  fetchEsHitsStatus = async (
    esHitsCheckConfig: StatusCheckType['esHitsCheck']
  ): Promise<StatusCheckStatesType> => {
    const { http } = getServices();
    try {
      const index = Array.isArray(esHitsCheckConfig.index)
        ? esHitsCheckConfig.index.join(',')
        : esHitsCheckConfig.index;
      const response: { count: number } = await http.post('/api/home/hits_status', {
        body: JSON.stringify({
          index,
          query: esHitsCheckConfig.query,
        }),
      });

      return response.count > 0 ? StatusCheckStates.HAS_DATA : StatusCheckStates.NO_DATA;
    } catch (e) {
      return StatusCheckStates.ERROR;
    }
  };

  renderInstructionSetsToggle = () => {
    if (!this.props.isCloudEnabled && this.state.tutorial?.onPremElasticCloud) {
      const selfManagedLabel = this.props.intl.formatMessage({
        id: 'home.tutorial.selfManagedButtonLabel',
        defaultMessage: 'Self managed',
      });
      const cloudLabel = this.props.intl.formatMessage({
        id: 'home.tutorial.elasticCloudButtonLabel',
        defaultMessage: 'Elastic Cloud',
      });
      const radioButtons = [
        {
          id: INSTRUCTIONS_TYPE.ON_PREM,
          label: selfManagedLabel,
          'data-test-subj': 'selfManagedTutorial',
        },
        {
          id: INSTRUCTIONS_TYPE.ON_PREM_ELASTIC_CLOUD,
          label: cloudLabel,
          'data-test-subj': 'onCloudTutorial',
        },
      ];
      return (
        <>
          <EuiSpacer />
          <EuiFormRow>
            <EuiButtonGroup
              isFullWidth
              buttonSize="m"
              options={radioButtons}
              idSelected={this.state.visibleInstructions}
              onChange={this.setVisibleInstructions}
              color="text"
              legend={i18n.translate('home.tutorial.selectionLegend', {
                defaultMessage: 'Deployment type',
              })}
            />
          </EuiFormRow>
        </>
      );
    }
  };
  onStatusCheck = (instructionSetIndex: number) => {
    this.setState(
      (prevState) => ({
        statusCheckStates: [
          ...prevState.statusCheckStates.slice(0, instructionSetIndex),
          StatusCheckStates.FETCHING,
          ...prevState.statusCheckStates.slice(instructionSetIndex + 1),
        ],
      }),
      () => this.checkInstructionSetStatus(instructionSetIndex)
    );
  };

  renderInstructionSets = ({ instructionSets }: { instructionSets: InstructionSetType[] }) => {
    let offset = 1;
    return instructionSets.map((instructionSet: InstructionSetType, index: number) => {
      const currentOffset = offset;
      offset += instructionSet.instructionVariants[0].instructions.length;

      return (
        <Fragment key={index}>
          <InstructionSet
            title={instructionSet.title}
            callOut={instructionSet.callOut}
            instructionVariants={instructionSet.instructionVariants}
            statusCheckConfig={instructionSet.statusCheck}
            statusCheckState={this.state.statusCheckStates[index]}
            onStatusCheck={() => {
              this.onStatusCheck(index);
            }}
            offset={currentOffset}
            replaceTemplateStrings={this.props.replaceTemplateStrings}
            isCloudEnabled={this.props.isCloudEnabled}
          />
          {index < instructionSets.length - 1 && <EuiSpacer />}
        </Fragment>
      );
    });
  };

  renderFooter = () => {
    let label;
    let url;
    if (_.has(this.state, 'tutorial.artifacts.application')) {
      label = this.state.tutorial?.artifacts?.application?.label ?? '';
      url = this.props.addBasePath(this.state.tutorial!.artifacts!.application!.path);
    } else if (_.has(this.state, 'tutorial.artifacts.dashboards')) {
      const overviewDashboard = this.state.tutorial?.artifacts?.dashboards.find((dashboard) => {
        return dashboard.isOverview;
      });
      if (overviewDashboard) {
        label = overviewDashboard.linkLabel;
        url = this.props.addBasePath(`/app/dashboards#/view/${overviewDashboard.id}`);
      }
    }

    if (url && label) {
      return (
        <>
          <EuiSpacer />
          <EuiPanel paddingSize="l">
            <Footer label={label} url={url} />
          </EuiPanel>
        </>
      );
    }
  };

  renderModuleNotices(): React.ReactNode {
    const notices = getServices().tutorialService.getModuleNotices();
    if (notices.length && this.state.tutorial?.moduleName) {
      return notices.map((ModuleNotice, index) => (
        <ModuleNotice key={index} moduleName={this.state.tutorial!.moduleName!} />
      ));
    } else {
      return null;
    }
  }

  render() {
    let content;
    if (this.state.notFound) {
      return (
        <KibanaPageTemplate
          isEmptyState={true}
          pageHeader={{
            iconType: 'faceSad',
            iconProps: {
              color: 'subdued',
            },
            pageTitle: (
              <FormattedMessage
                id="home.tutorial.noTutorialLabel"
                defaultMessage="Unable to find tutorial {tutorialId}"
                values={{ tutorialId: this.props.tutorialId }}
              />
            ),
            rightSideItems: [
              <EuiButton
                href={this.props.addBasePath('/app/home#/tutorial_directory')}
                fill
                iconType="sortLeft"
                iconSide="left"
              >
                {i18n.translate('home.tutorial.backToDirectory', {
                  defaultMessage: 'Back to directory',
                })}
              </EuiButton>,
            ],
          }}
        />
      );
    }

    if (this.state.tutorial) {
      let previewUrl;
      if (this.state.tutorial!.previewImagePath) {
        previewUrl = this.props.addBasePath(this.state.tutorial.previewImagePath);
      }

      let exportedFieldsUrl;
      if (_.has(this.state, 'tutorial.artifacts.exportedFields')) {
        exportedFieldsUrl = this.props.replaceTemplateStrings(
          this.state.tutorial.artifacts?.exportedFields?.documentationUrl ?? ''
        );
      }

      let icon = this.state.tutorial.euiIconType;
      if (icon && icon.includes('/')) {
        icon = this.props.addBasePath(icon);
      }

      const instructions = this.getInstructions();
      content = (
        <div>
          <Introduction
            category={this.state.tutorial.category as TutorialCategoryType}
            title={this.state.tutorial.name}
            description={this.props.replaceTemplateStrings(this.state.tutorial.longDescription)}
            previewUrl={previewUrl}
            exportedFieldsUrl={exportedFieldsUrl}
            iconType={icon}
            isBeta={this.state.tutorial.isBeta}
            notices={this.renderModuleNotices()}
            basePath={getServices().http.basePath}
          />

          {this.renderInstructionSetsToggle()}

          <EuiSpacer />
          {instructions && this.renderInstructionSets(instructions)}
          {this.renderFooter()}
        </div>
      );
    }
    return (
      <KibanaPageTemplate>
        <KibanaPageTemplate.Section>{content}</KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }
}

export const Tutorial = injectI18n(TutorialUi);
