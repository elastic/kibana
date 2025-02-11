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
import {
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
} from '@kbn/core-saved-objects-api-browser';
import { CustomStatusCheckCallback } from '../../../services/tutorials/tutorial_service';
import { Footer } from './footer';
import { Introduction } from './introduction';
import { InstructionSet, StatusCheckConfigShape, InstructionVariantShape } from './instruction_set';
import { SavedObjectsInstaller } from './saved_objects_installer';
import * as StatusCheckStates from './status_check_states';
import { getServices, HomeKibanaServices } from '../../kibana_services';
import { ParameterFormParam } from './parameter_form';

const INSTRUCTIONS_TYPE = {
  ELASTIC_CLOUD: 'elasticCloud',
  ON_PREM: 'onPrem',
  ON_PREM_ELASTIC_CLOUD: 'onPremElasticCloud',
} as const;

const integrationsTitle = i18n.translate('home.breadcrumbs.integrationsAppTitle', {
  defaultMessage: 'Integrations',
});

export interface TutorialProps {
  addBasePath: HomeKibanaServices['addBasePath'];
  isCloudEnabled: boolean;
  getTutorial: (id: string) => Promise<Tutorial>; // nope
  replaceTemplateStrings: (text: string) => string;
  tutorialId: string;
  bulkCreate: (
    objects: Array<SavedObjectsBulkCreateObject<unknown>>,
    options?: SavedObjectsBulkCreateOptions | undefined
  ) => Promise<SavedObjectsBatchResponse<unknown>>; // duplicate inside tutorial_service props
  intl: InjectedIntl; // ?
}

interface StatusCheck {
  btnLabel: string;
  error: string;
  success: string;
  text: string;
  title: string;
  esHitsCheck: {
    index: string[];
    query: {
      bool: {
        filter: Array<{
          terms: {
            'processor.event': string[];
          };
        }>;
      };
    };
  };
}
interface InstructionSet {
  title: string;
  instructionVariants: InstructionVariantShape[];
  callOut?: {
    iconType: string;
    message: string;
    title: string;
  };
  statusCheck: StatusCheckConfigShape;
  params: ParameterFormParam[];
}
interface InstructionParam {
  id: string;
  defaultValue: string;
}
interface SavedObject {
  id: string;
  type: string;
  attributes: unknown;
  version: string;
}
interface Dashboard {
  isOverview: string;
  linkLabel: string;
  id: string;
}
export interface Tutorial {
  id: string;
  name: string;
  elasticCloud: {
    params?: InstructionParam[];
    instructionSets: InstructionSet[];
  };
  onPrem: {
    params?: InstructionParam[];
    instructionSets: InstructionSet[];
  };
  onPremElasticCloud: {
    params?: InstructionParam[];
    instructionSets: InstructionSet[];
  };
  customStatusCheckName: string;
  savedObjects?: SavedObject[]; // optional?
  savedObjectsInstallMsg?: string; // optional?
  artifacts?: {
    dashboards: Dashboard[];
    exportedFields: {
      documentationUrl: string;
    };
    application: {
      label: string;
      dashboards: unknown;
      path: string;
    };
  };
  euiIconType: string;
  moduleName?: string;
  previewImagePath?: string;
  category?: unknown;
  shortDescription?: string;
  longDescription: string;
  isBeta?: boolean;
}
type StatusCheckStatesType = 'HAS_DATA' | 'NO_DATA' | 'ERROR' | 'NOT_CHECKED' | 'FETCHING';

interface TutorialState {
  notFound: boolean;
  paramValues: { [key: string]: string | number }; // remove any
  statusCheckStates: StatusCheckStatesType[];
  tutorial: Tutorial | null; // not sure (ITutorial is in load_tutorials)
  visibleInstructions: (typeof INSTRUCTIONS_TYPE)[keyof typeof INSTRUCTIONS_TYPE] | string; // useless - just string, but without "string" inside onChange on button component it errors
}

class TutorialUi extends React.Component<TutorialProps, TutorialState> {
  private _isMounted: boolean;

  constructor(props: TutorialProps) {
    super(props);

    this.state = {
      notFound: false,
      paramValues: {},
      statusCheckStates: [],
      tutorial: null,
      visibleInstructions: props.isCloudEnabled
        ? INSTRUCTIONS_TYPE.ELASTIC_CLOUD
        : INSTRUCTIONS_TYPE.ON_PREM,
    };

    this._isMounted = false; // why? here and line 52
  }

  UNSAFE_componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async componentDidMount() {
    const tutorial = await this.props.getTutorial(this.props.tutorialId);
    console.log('tutorial!!!!!!!!!', tutorial);

    if (!this._isMounted) {
      return;
    }

    if (tutorial) {
      this.setState({ tutorial }, this.initInstructionsState);
    } else {
      this.setState({ notFound: true });
    }

    getServices().chrome.setBreadcrumbs([
      {
        text: integrationsTitle,
        href: this.props.addBasePath('/app/integrations/browse'),
      },
      {
        text: tutorial ? tutorial.name : this.props.tutorialId,
      },
    ]);
  }

  getInstructions = () => {
    if (!this.state.tutorial) {
      // if there is no tutorial - instructionSets empty
      return { instructionSets: [] };
    }

    switch (
      this.state.visibleInstructions // if there is a tutorial
    ) {
      case INSTRUCTIONS_TYPE.ELASTIC_CLOUD: // if tutorial for cloud
        return this.state.tutorial.elasticCloud; // return tutorial for cloud
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

  getInstructionSets = (): InstructionSet[] => {
    return this.getInstructions().instructionSets;
  };

  initInstructionsState = () => {
    const instructions = this.getInstructions();
    const paramValues: TutorialState['paramValues'] = {};
    if (instructions.params) {
      instructions.params.forEach((param: InstructionParam) => {
        paramValues[param.id] = param.defaultValue;
      });
    }

    const statusCheckStates = new Array(instructions.instructionSets?.length ?? 0).fill(
      StatusCheckStates.NOT_CHECKED
    );

    this.setState({
      paramValues,
      statusCheckStates,
    });
  };

  setVisibleInstructions = (instructionsType: TutorialState['visibleInstructions']) => {
    // not sure
    this.setState(
      {
        visibleInstructions: instructionsType,
      },
      this.initInstructionsState
    );
  };

  setParameter = (paramId: string, newValue: string) => {
    this.setState((previousState) => {
      const paramValues = _.cloneDeep(previousState.paramValues);
      paramValues[paramId] = newValue;
      return { paramValues };
    });
  };

  checkInstructionSetStatus = async (instructionSetIndex: number) => {
    const instructionSets = this.getInstructionSets();

    if (!instructionSets) {
      return;
    }

    const instructionSet = instructionSets[instructionSetIndex];
    if (!instructionSet) {
      return;
    }
    const esHitsCheckConfig = _.get(instructionSet, `statusCheck.esHitsCheck`); // index-string, query - nested stuff

    // Checks if a custom status check callback  was registered in the CLIENT
    // that matches the same name registered in the SERVER (customStatusCheckName)
    if (this.state.tutorial) {
      // what gets returned if tutorial is null ?
      const customStatusCheckCallback = getServices().tutorialService.getCustomStatusCheck(
        this.state.tutorial.customStatusCheckName
      ); // "apm_fleet_server_status_check"

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
        return { statusCheckStates: newStatusCheckStates };
      });
    }
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
    esHitsCheckConfig: StatusCheck['esHitsCheck']
  ): Promise<StatusCheckStatesType> => {
    const { http } = getServices();
    try {
      // Convert index array to a comma-separated string if necessary. without it 400
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
        // don't understand why old option below doesn't work
        // statusCheckStates: {
        //   ...prevState.statusCheckStates,
        //   [instructionSetIndex]: StatusCheckStates.FETCHING,
        // },
      }),
      this.checkInstructionSetStatus.bind(null, instructionSetIndex)
    );
  };

  renderInstructionSets = ({ instructionSets }: { instructionSets: InstructionSet[] }) => {
    let offset = 1;
    return instructionSets.map((instructionSet: InstructionSet, index: number) => {
      const currentOffset = offset;
      if (instructionSet.instructionVariants && instructionSet.instructionVariants.length > 0) {
        offset +=
          instructionSet.instructionVariants[0].instructions.length > 0
            ? instructionSet.instructionVariants[0].instructions.length
            : 0;
      } else {
        offset += 0;
      }

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
            params={instructionSet.params}
            paramValues={this.state.paramValues}
            setParameter={this.setParameter}
            replaceTemplateStrings={this.props.replaceTemplateStrings}
            isCloudEnabled={this.props.isCloudEnabled}
          />
          {index < instructionSets.length - 1 && <EuiSpacer />}
        </Fragment>
      );
    });
  };

  renderSavedObjectsInstaller = () => {
    if (!this.state.tutorial?.savedObjects) {
      return;
    }

    return (
      <>
        <EuiSpacer />
        <EuiPanel paddingSize="l">
          <SavedObjectsInstaller
            bulkCreate={this.props.bulkCreate}
            savedObjects={this.state.tutorial.savedObjects}
            installMsg={this.state.tutorial.savedObjectsInstallMsg}
          />
        </EuiPanel>
      </>
    );
  };

  renderFooter = () => {
    let label;
    let url;
    if (_.has(this.state, 'tutorial.artifacts.application')) {
      label = this.state.tutorial?.artifacts?.application.label;
      url = this.props.addBasePath(this.state.tutorial!.artifacts!.application.path); // don't like ! above
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

  renderModuleNotices() {
    const notices = getServices().tutorialService.getModuleNotices();
    if (notices.length && this.state.tutorial!.moduleName) {
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
          this.state.tutorial.artifacts!.exportedFields.documentationUrl
        );
      }

      let icon = this.state.tutorial.euiIconType;
      if (icon && icon.includes('/')) {
        icon = this.props.addBasePath(icon);
      }

      const instructions = this.getInstructions();
      content = (
        <div style={{ border: '3px solid red' }}>
          <Introduction
            category={this.state.tutorial.category}
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
          {this.renderInstructionSets(instructions)}
          {this.renderSavedObjectsInstaller()}
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
