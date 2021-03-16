/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import * as Rx from 'rxjs';
import { share } from 'rxjs/operators';
import { isEqual, isEmpty, debounce } from 'lodash';
import { EventEmitter } from 'events';

import { IUiSettingsClient } from 'kibana/public';
import { TimeRange } from 'src/plugins/data/public';
import {
  PersistedState,
  Vis,
  VisualizeEmbeddableContract,
} from 'src/plugins/visualizations/public';
import { TimeseriesVisData } from 'src/plugins/vis_type_timeseries/common/types';
import { KibanaContextProvider } from '../../../../../plugins/kibana_react/public';
import { Storage } from '../../../../../plugins/kibana_utils/public';

// @ts-expect-error
import { VisEditorVisualization } from './vis_editor_visualization';
import { PanelConfig } from './panel_config';
import { extractIndexPatterns } from '../../../common/extract_index_patterns';
import { VisPicker } from './vis_picker';
import { fetchFields, VisFields } from '../lib/fetch_fields';
import { getDataStart, getCoreStart } from '../../services';
import { TimeseriesVisParams } from '../../types';

const VIS_STATE_DEBOUNCE_DELAY = 200;
const APP_NAME = 'VisEditor';

export interface TimeseriesEditorProps {
  config: IUiSettingsClient;
  embeddableHandler: VisualizeEmbeddableContract;
  eventEmitter: EventEmitter;
  timeRange: TimeRange;
  uiState: PersistedState;
  vis: Vis<TimeseriesVisParams>;
}

interface TimeseriesEditorState {
  autoApply: boolean;
  dirty: boolean;
  extractedIndexPatterns: string[];
  model: TimeseriesVisParams;
  visFields?: VisFields;
}

export class VisEditor extends Component<TimeseriesEditorProps, TimeseriesEditorState> {
  private abortControllerFetchFields?: AbortController;
  private localStorage: Storage;
  private visDataSubject: Rx.BehaviorSubject<TimeseriesVisData | undefined>;
  private visData$: Rx.Observable<TimeseriesVisData | undefined>;

  constructor(props: TimeseriesEditorProps) {
    super(props);
    this.localStorage = new Storage(window.localStorage);
    this.state = {
      autoApply: true,
      dirty: false,
      model: this.props.vis.params,
      extractedIndexPatterns: [''],
    };

    this.visDataSubject = new Rx.BehaviorSubject<TimeseriesVisData | undefined>(undefined);
    this.visData$ = this.visDataSubject.asObservable().pipe(share());
  }

  getConfig = (key: string) => {
    return this.props.config.get(key);
  };

  updateVisState = debounce(() => {
    this.props.vis.params = this.state.model;
    this.props.embeddableHandler.reload();
    this.props.eventEmitter.emit('dirtyStateChange', {
      isDirty: false,
    });

    const extractedIndexPatterns = extractIndexPatterns(
      this.state.model,
      this.state.model.default_index_pattern
    );
    if (!isEqual(this.state.extractedIndexPatterns, extractedIndexPatterns)) {
      this.abortableFetchFields(extractedIndexPatterns).then((visFields) => {
        this.setState({
          visFields,
          extractedIndexPatterns,
        });
      });
    }
  }, VIS_STATE_DEBOUNCE_DELAY);

  abortableFetchFields = (extractedIndexPatterns: string[]) => {
    this.abortControllerFetchFields?.abort();
    this.abortControllerFetchFields = new AbortController();

    return fetchFields(extractedIndexPatterns, this.abortControllerFetchFields.signal);
  };

  handleChange = (partialModel: Partial<TimeseriesVisParams>) => {
    if (isEmpty(partialModel)) {
      return;
    }
    const hasTypeChanged = partialModel.type && this.state.model.type !== partialModel.type;
    const nextModel = {
      ...this.state.model,
      ...partialModel,
    };
    let dirty = true;
    if (this.state.autoApply || hasTypeChanged) {
      this.updateVisState();

      dirty = false;
    }

    this.setState({
      dirty,
      model: nextModel,
    });
  };

  updateModel = () => {
    const { params } = this.props.vis.clone();

    this.setState({
      model: params,
    });
  };

  handleCommit = () => {
    this.updateVisState();
    this.setState({ dirty: false });
  };

  handleAutoApplyToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ autoApply: event.target.checked });
  };

  onDataChange = ({ visData }: { visData: TimeseriesVisData }) => {
    this.visDataSubject.next(visData);
  };

  render() {
    const { model, visFields } = this.state;

    if (!visFields) {
      // wait for fields initialization
      return null;
    }

    return (
      <KibanaContextProvider
        services={{
          appName: APP_NAME,
          storage: this.localStorage,
          data: getDataStart(),
          ...getCoreStart(),
        }}
      >
        <div className="tvbEditor" data-test-subj="tvbVisEditor">
          <div className="tvbEditor--hideForReporting">
            <VisPicker currentVisType={model.type} onChange={this.handleChange} />
          </div>
          <VisEditorVisualization
            dirty={this.state.dirty}
            autoApply={this.state.autoApply}
            model={model}
            embeddableHandler={this.props.embeddableHandler}
            eventEmitter={this.props.eventEmitter}
            vis={this.props.vis}
            timeRange={this.props.timeRange}
            uiState={this.props.uiState}
            onCommit={this.handleCommit}
            onToggleAutoApply={this.handleAutoApplyToggle}
            title={this.props.vis.title}
            description={this.props.vis.description}
            onDataChange={this.onDataChange}
          />
          <div className="tvbEditor--hideForReporting">
            <PanelConfig
              fields={visFields}
              model={model}
              visData$={this.visData$}
              onChange={this.handleChange}
              getConfig={this.getConfig}
            />
          </div>
        </div>
      </KibanaContextProvider>
    );
  }

  componentDidMount() {
    const dataStart = getDataStart();

    dataStart.indexPatterns.getDefault().then(async (index) => {
      const defaultIndexTitle = index?.title ?? '';
      const indexPatterns = extractIndexPatterns(this.props.vis.params, defaultIndexTitle);
      const visFields = await fetchFields(indexPatterns);

      this.setState((state) => ({
        model: {
          ...state.model,
          /** @legacy
           *  please use IndexPatterns service instead
           * **/
          default_index_pattern: defaultIndexTitle,
          /** @legacy
           *  please use IndexPatterns service instead
           * **/
          default_timefield: index?.timeFieldName ?? '',
        },
        visFields,
      }));
    });

    this.props.eventEmitter.on('updateEditor', this.updateModel);
  }

  componentWillUnmount() {
    this.updateVisState.cancel();
    this.props.eventEmitter.off('updateEditor', this.updateModel);
  }
}

// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { VisEditor as default };
