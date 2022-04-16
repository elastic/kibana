/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import {
  ApplicationStart,
  IUiSettingsClient,
  SavedObjectsStart,
  DocLinksStart,
} from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { SearchSelection } from './search_selection';
import { GroupSelection } from './group_selection';
import { AggBasedSelection } from './agg_based_selection';
import type { TypesStart, BaseVisType, VisTypeAlias } from '../vis_types';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../common/constants';
import './dialog.scss';

interface TypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  visTypesRegistry: TypesStart;
  editorParams?: string[];
  addBasePath: (path: string) => string;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  savedObjects: SavedObjectsStart;
  usageCollection?: UsageCollectionSetup;
  application: ApplicationStart;
  outsideVisualizeApp?: boolean;
  stateTransfer?: EmbeddableStateTransfer;
  originatingApp?: string;
  showAggsSelection?: boolean;
  selectedVisType?: BaseVisType;
}

interface TypeSelectionState {
  showSearchVisModal: boolean;
  showGroups: boolean;
  visType?: BaseVisType;
}

// TODO: redirect logic is specific to visualise & dashboard
// but it is likely should be decoupled. e.g. handled by the container instead
const basePath = `/create?`;
const baseUrl = `/app/visualize#${basePath}`;

class NewVisModal extends React.Component<TypeSelectionProps, TypeSelectionState> {
  public static defaultProps = {
    editorParams: [],
  };

  private readonly isLabsEnabled: boolean;
  private readonly trackUiMetric:
    | ((type: UiCounterMetricType, eventNames: string | string[], count?: number) => void)
    | undefined;

  constructor(props: TypeSelectionProps) {
    super(props);
    this.isLabsEnabled = props.uiSettings.get(VISUALIZE_ENABLE_LABS_SETTING);

    this.state = {
      showSearchVisModal: Boolean(this.props.selectedVisType),
      showGroups: !this.props.showAggsSelection,
      visType: this.props.selectedVisType,
    };

    this.trackUiMetric = this.props.usageCollection?.reportUiCounter.bind(
      this.props.usageCollection,
      'visualize'
    );
  }

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const visNewVisDialogAriaLabel = i18n.translate(
      'visualizations.newVisWizard.helpTextAriaLabel',
      {
        defaultMessage:
          'Start creating your visualization by selecting a type for that visualization. Hit escape to close this modal. Hit Tab key to go further.',
      }
    );

    const WizardComponent = this.state.showGroups ? GroupSelection : AggBasedSelection;

    const selectionModal =
      this.state.showSearchVisModal && this.state.visType ? (
        <EuiModal onClose={this.onCloseModal} className="visNewVisSearchDialog">
          <SearchSelection
            onSearchSelected={this.onSearchSelected}
            visType={this.state.visType}
            uiSettings={this.props.uiSettings}
            savedObjects={this.props.savedObjects}
            goBack={() => this.setState({ showSearchVisModal: false })}
          />
        </EuiModal>
      ) : (
        <EuiModal
          onClose={this.onCloseModal}
          className={this.state.showGroups ? 'visNewVisDialog' : 'visNewVisDialog--aggbased'}
          aria-label={visNewVisDialogAriaLabel}
        >
          <WizardComponent
            showExperimental={this.isLabsEnabled}
            onVisTypeSelected={this.onVisTypeSelected}
            visTypesRegistry={this.props.visTypesRegistry}
            docLinks={this.props.docLinks}
            toggleGroups={(flag: boolean) => this.setState({ showGroups: flag })}
          />
        </EuiModal>
      );

    return selectionModal;
  }

  private onCloseModal = () => {
    this.setState({ showSearchVisModal: false });
    this.props.onClose();
  };

  private onVisTypeSelected = (visType: BaseVisType | VisTypeAlias) => {
    if (!('aliasPath' in visType) && visType.requiresSearch && visType.options.showIndexSelection) {
      this.setState({
        showSearchVisModal: true,
        visType,
      });
    } else {
      this.redirectToVis(visType);
    }
  };

  private onSearchSelected = (searchId: string, searchType: string) => {
    this.redirectToVis(this.state.visType!, searchType, searchId);
  };

  private redirectToVis(
    visType: BaseVisType | VisTypeAlias,
    searchType?: string,
    searchId?: string
  ) {
    if (this.trackUiMetric) {
      this.trackUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
    }

    let params;
    if ('aliasPath' in visType) {
      params = visType.aliasPath;
      this.props.onClose();
      this.navigate(visType.aliasApp, visType.aliasPath);
      return;
    }

    params = [`type=${encodeURIComponent(visType.name)}`];

    if (searchType) {
      params.push(`${searchType === 'search' ? 'savedSearchId' : 'indexPattern'}=${searchId}`);
    }
    params = params.concat(this.props.editorParams!);

    this.props.onClose();
    if (this.props.outsideVisualizeApp) {
      this.navigate('visualize', `#${basePath}${params.join('&')}`);
    } else {
      location.assign(this.props.addBasePath(`${baseUrl}${params.join('&')}`));
    }
  }

  private navigate(appId: string, params: string) {
    if (this.props.stateTransfer && this.props.originatingApp) {
      this.props.stateTransfer.navigateToEditor(appId, {
        path: params,
        state: {
          originatingApp: this.props.originatingApp,
        },
      });
    } else {
      this.props.application.navigateToApp(appId, {
        path: params,
      });
    }
  }
}

// Needed for React.lazy
// eslint-disable-next-line import/no-default-export
export { NewVisModal as default };
