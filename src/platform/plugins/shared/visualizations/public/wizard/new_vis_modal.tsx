/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiModal,
  mathWithUnits,
  type UseEuiTheme,
  euiBreakpoint,
  COLOR_MODES_STANDARD,
} from '@elastic/eui';

import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { ApplicationStart, DocLinksStart, IUiSettingsClient } from '@kbn/core/public';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { css } from '@emotion/react';
import { SearchSelection } from './search_selection';
import { GroupSelection } from './group_selection';
import { AggBasedSelection } from './agg_based_selection';
import type { TypesStart, BaseVisType, VisTypeAlias } from '../vis_types';

const modalWidth = ({ euiTheme }: UseEuiTheme) => mathWithUnits(euiTheme.size.s, (x) => x * 100);
const modalHeight = ({ euiTheme }: UseEuiTheme) => mathWithUnits(euiTheme.size.s, (x) => x * 90);
const lightSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='313' height='461' viewBox='0 0 313 461'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%23F5F7FA' d='M294.009,184.137 C456.386,184.137 588.018,315.77 588.018,478.146 C588.018,640.523 456.386,772.156 294.009,772.156 C131.632,772.156 0,640.523 0,478.146 C0,315.77 131.632,184.137 294.009,184.137 Z M294.009,384.552 C242.318,384.552 200.415,426.456 200.415,478.146 C200.415,529.837 242.318,571.741 294.009,571.741 C345.7,571.741 387.604,529.837 387.604,478.146 C387.604,426.456 345.7,384.552 294.009,384.552 Z'/%3E%3Cpath fill='%23E6EBF2' d='M202.958,365.731 L202.958,380.991 L187.698,380.991 L187.698,365.731 L202.958,365.731 Z M202.958,327.073 L202.958,342.333 L187.698,342.333 L187.698,327.073 L202.958,327.073 Z M243.651,325.038 L243.651,340.298 L228.391,340.298 L228.391,325.038 L243.651,325.038 Z M243.651,286.379 L243.651,301.639 L228.391,301.639 L228.391,286.379 L243.651,286.379 Z M202.958,285.362 L202.958,300.622 L187.698,300.622 L187.698,285.362 L202.958,285.362 Z M284.345,284.345 L284.345,299.605 L269.085,299.605 L269.085,284.345 L284.345,284.345 Z M284.345,245.686 L284.345,260.946 L269.085,260.946 L269.085,245.686 L284.345,245.686 Z M243.651,244.669 L243.651,259.929 L228.391,259.929 L228.391,244.669 L243.651,244.669 Z M202.958,243.651 L202.958,258.911 L187.698,258.911 L187.698,243.651 L202.958,243.651 Z M284.345,203.975 L284.345,219.235 L269.085,219.235 L269.085,203.975 L284.345,203.975 Z M202.958,203.975 L202.958,219.235 L187.698,219.235 L187.698,203.975 L202.958,203.975 Z M243.651,202.958 L243.651,218.218 L228.391,218.218 L228.391,202.958 L243.651,202.958 Z M243.651,163.282 L243.651,178.542 L228.391,178.542 L228.391,163.282 L243.651,163.282 Z M202.958,163.282 L202.958,178.542 L187.698,178.542 L187.698,163.282 L202.958,163.282 Z M284.345,162.265 L284.345,177.525 L269.085,177.525 L269.085,162.265 L284.345,162.265 Z M284.345,122.589 L284.345,137.849 L269.085,137.849 L269.085,122.589 L284.345,122.589 Z M243.651,122.589 L243.651,137.849 L228.391,137.849 L228.391,122.589 L243.651,122.589 Z M202.958,122.589 L202.958,137.849 L187.698,137.849 L187.698,122.589 L202.958,122.589 Z M284.345,81.8954 L284.345,97.1554 L269.085,97.1554 L269.085,81.8954 L284.345,81.8954 Z M243.651,81.8954 L243.651,97.1554 L228.391,97.1554 L228.391,81.8954 L243.651,81.8954 Z M202.958,81.8954 L202.958,97.1554 L187.698,97.1554 L187.698,81.8954 L202.958,81.8954 Z M284.345,41.202 L284.345,56.462 L269.085,56.462 L269.085,41.202 L284.345,41.202 Z M243.651,41.202 L243.651,56.462 L228.391,56.462 L228.391,41.202 L243.651,41.202 Z M284.345,0.508789 L284.345,15.7688 L269.085,15.7688 L269.085,0.508789 L284.345,0.508789 Z'/%3E%3C/g%3E%3C/svg%3E")`;
const darkSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='313' height='461' viewBox='0 0 313 461'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath fill='%2318191E' d='M294.009,184.137 C456.386,184.137 588.018,315.77 588.018,478.146 C588.018,640.523 456.386,772.156 294.009,772.156 C131.632,772.156 0,640.523 0,478.146 C0,315.77 131.632,184.137 294.009,184.137 Z M294.009,384.552 C242.318,384.552 200.415,426.456 200.415,478.146 C200.415,529.837 242.318,571.741 294.009,571.741 C345.7,571.741 387.604,529.837 387.604,478.146 C387.604,426.456 345.7,384.552 294.009,384.552 Z'/%3E%3Cpath fill='%2315161B' d='M202.958,365.731 L202.958,380.991 L187.698,380.991 L187.698,365.731 L202.958,365.731 Z M202.958,327.073 L202.958,342.333 L187.698,342.333 L187.698,327.073 L202.958,327.073 Z M243.651,325.038 L243.651,340.298 L228.391,340.298 L228.391,325.038 L243.651,325.038 Z M243.651,286.379 L243.651,301.639 L228.391,301.639 L228.391,286.379 L243.651,286.379 Z M202.958,285.362 L202.958,300.622 L187.698,300.622 L187.698,285.362 L202.958,285.362 Z M284.345,284.345 L284.345,299.605 L269.085,299.605 L269.085,284.345 L284.345,284.345 Z M284.345,245.686 L284.345,260.946 L269.085,260.946 L269.085,245.686 L284.345,245.686 Z M243.651,244.669 L243.651,259.929 L228.391,259.929 L228.391,244.669 L243.651,244.669 Z M202.958,243.651 L202.958,258.911 L187.698,258.911 L187.698,243.651 L202.958,243.651 Z M284.345,203.975 L284.345,219.235 L269.085,219.235 L269.085,203.975 L284.345,203.975 Z M202.958,203.975 L202.958,219.235 L187.698,219.235 L187.698,203.975 L202.958,203.975 Z M243.651,202.958 L243.651,218.218 L228.391,218.218 L228.391,202.958 L243.651,202.958 Z M243.651,163.282 L243.651,178.542 L228.391,178.542 L228.391,163.282 L243.651,163.282 Z M202.958,163.282 L202.958,178.542 L187.698,178.542 L187.698,163.282 L202.958,163.282 Z M284.345,162.265 L284.345,177.525 L269.085,177.525 L269.085,162.265 L284.345,162.265 Z M284.345,122.589 L284.345,137.849 L269.085,137.849 L269.085,122.589 L284.345,122.589 Z M243.651,122.589 L243.651,137.849 L228.391,137.849 L228.391,122.589 L243.651,122.589 Z M202.958,122.589 L202.958,137.849 L187.698,137.849 L187.698,122.589 L202.958,122.589 Z M284.345,81.8954 L284.345,97.1554 L269.085,97.1554 L269.085,81.8954 L284.345,81.8954 Z M243.651,81.8954 L243.651,97.1554 L228.391,97.1554 L228.391,81.8954 L243.651,81.8954 Z M202.958,81.8954 L202.958,97.1554 L187.698,97.1554 L187.698,81.8954 L202.958,81.8954 Z M284.345,41.202 L284.345,56.462 L269.085,56.462 L269.085,41.202 L284.345,41.202 Z M243.651,41.202 L243.651,56.462 L228.391,56.462 L228.391,41.202 L243.651,41.202 Z M284.345,0.508789 L284.345,15.7688 L269.085,15.7688 L269.085,0.508789 L284.345,0.508789 Z'/%3E%3C/g%3E%3C/svg%3E")`;

const newVisModalStyles = {
  base: (euiThemeContext: UseEuiTheme) =>
    css({
      maxWidth: modalWidth(euiThemeContext),
      maxHeight: modalHeight(euiThemeContext),
      background: euiThemeContext.euiTheme.colors.backgroundBasePlain,
      [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
        maxHeight: '100%',
      },
    }),
  aggbased: (euiThemeContext: UseEuiTheme) =>
    css({
      maxWidth: modalWidth(euiThemeContext),
      maxHeight: modalHeight(euiThemeContext),
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'calc(100% + 1px) calc(100% + 1px)',
      backgroundSize: '30%',
      backgroundImage:
        euiThemeContext.colorMode === COLOR_MODES_STANDARD.light ? lightSvg : darkSvg,
      [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
        maxHeight: '100%',
      },
    }),
  searchDialog: (euiThemeContext: UseEuiTheme) =>
    css({
      minWidth: modalWidth(euiThemeContext),
      minHeight: modalHeight(euiThemeContext),
    }),
};

export interface TypeSelectionProps {
  contentClient: ContentClient;
  isOpen: boolean;
  onClose: () => void;
  visTypesRegistry: TypesStart;
  editorParams?: string[];
  addBasePath: (path: string) => string;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  application: ApplicationStart;
  outsideVisualizeApp?: boolean;
  stateTransfer?: EmbeddableStateTransfer;
  originatingApp?: string;
  showAggsSelection?: boolean;
  selectedVisType?: BaseVisType;
}

interface TypeSelectionState {
  showSearchVisModal: boolean;
  isMainDialogShown: boolean;
  visType?: BaseVisType;
  tab: 'recommended' | 'legacy';
}

// TODO: redirect logic is specific to visualise & dashboard
// but it is likely should be decoupled. e.g. handled by the container instead
const basePath = `/create?`;
const baseUrl = `/app/visualize#${basePath}`;

class NewVisModal extends React.Component<TypeSelectionProps, TypeSelectionState> {
  public static defaultProps = {
    editorParams: [],
  };

  private readonly trackUiMetric:
    | ((type: UiCounterMetricType, eventNames: string | string[], count?: number) => void)
    | undefined;

  constructor(props: TypeSelectionProps) {
    super(props);

    this.state = {
      showSearchVisModal: Boolean(this.props.selectedVisType),
      isMainDialogShown: !this.props.showAggsSelection,
      visType: this.props.selectedVisType,
      tab: 'recommended',
    };
  }

  public setTab = (tab: 'recommended' | 'legacy') => {
    this.setState({ tab });
  };

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const WizardComponent = this.state.isMainDialogShown ? GroupSelection : AggBasedSelection;

    const selectionModal =
      this.state.showSearchVisModal && this.state.visType ? (
        <EuiModal
          onClose={this.onCloseModal}
          aria-labelledby="vis-wizard-modal-title"
          css={newVisModalStyles.searchDialog}
        >
          <SearchSelection
            contentClient={this.props.contentClient}
            uiSettings={this.props.uiSettings}
            onSearchSelected={this.onSearchSelected}
            visType={this.state.visType}
            goBack={() => this.setState({ showSearchVisModal: false })}
          />
        </EuiModal>
      ) : (
        <EuiModal
          onClose={this.onCloseModal}
          aria-labelledby="vis-wizard-modal-title"
          css={this.state.isMainDialogShown ? newVisModalStyles.base : newVisModalStyles.aggbased}
        >
          <WizardComponent
            onVisTypeSelected={this.onVisTypeSelected}
            visTypesRegistry={this.props.visTypesRegistry}
            docLinks={this.props.docLinks}
            setTab={this.setTab}
            tab={this.state.tab}
            showMainDialog={(shouldMainBeShown: boolean) => {
              this.setState({ isMainDialogShown: shouldMainBeShown });
              if (shouldMainBeShown) {
                this.setTab('legacy');
              }
            }}
            openedAsRoot={this.props.showAggsSelection && !this.props.selectedVisType}
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
    if ('visConfig' in visType && visType.requiresSearch && visType.options.showIndexSelection) {
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
    if ('alias' in visType) {
      if (visType.alias && 'path' in visType.alias) {
        params = visType.alias.path;
        this.props.onClose();
        this.navigate(visType.alias.app, visType.alias.path);
      }
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
