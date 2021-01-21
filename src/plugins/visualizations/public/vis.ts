/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * @name Vis
 *
 * @description This class consists of aggs, params, listeners, title, and type.
 *  - Aggs: Instances of IAggConfig.
 *  - Params: The settings in the Options tab.
 *
 * Not to be confused with vislib/vis.js.
 */

import { isFunction, defaults, cloneDeep } from 'lodash';
import { Assign } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';

import { PersistedState } from './persisted_state';
import { getTypes, getAggs, getSearch, getSavedSearchLoader } from './services';
import { VisType } from './vis_types';
import {
  IAggConfigs,
  IndexPattern,
  ISearchSource,
  AggConfigOptions,
  SearchSourceFields,
} from '../../../plugins/data/public';

export interface SerializedVisData {
  expression?: string;
  aggs: AggConfigOptions[];
  searchSource: SearchSourceFields;
  savedSearchId?: string;
}

export interface SerializedVis {
  id?: string;
  title: string;
  description?: string;
  type: string;
  params: VisParams;
  uiState?: any;
  data: SerializedVisData;
}

export interface VisData {
  ast?: string;
  aggs?: IAggConfigs;
  indexPattern?: IndexPattern;
  searchSource?: ISearchSource;
  savedSearchId?: string;
}

export interface VisParams {
  [key: string]: any;
}

const getSearchSource = async (inputSearchSource: ISearchSource, savedSearchId?: string) => {
  const searchSource = inputSearchSource.createCopy();
  if (savedSearchId) {
    const savedSearch = await getSavedSearchLoader().get(savedSearchId);

    searchSource.setParent(savedSearch.searchSource);
  }
  searchSource.setField('size', 0);
  return searchSource;
};

type PartialVisState = Assign<SerializedVis, { data: Partial<SerializedVisData> }>;

export class Vis<TVisParams = VisParams> {
  public readonly type: VisType<TVisParams>;
  public readonly id?: string;
  public title: string = '';
  public description: string = '';
  public params: TVisParams;
  // Session state is for storing information that is transitory, and will not be saved with the visualization.
  // For instance, map bounds, which depends on the view port, browser window size, etc.
  public sessionState: Record<string, any> = {};
  public data: VisData = {};

  public readonly uiState: PersistedState;

  constructor(visType: string, visState: SerializedVis = {} as any) {
    this.type = this.getType(visType);
    this.params = this.getParams(visState.params);
    this.uiState = new PersistedState(visState.uiState);
    this.id = visState.id;
  }

  private getType(visType: string) {
    const type = getTypes().get<TVisParams>(visType);
    if (!type) {
      const errorMessage = i18n.translate('visualizations.visualizationTypeInvalidMessage', {
        defaultMessage: 'Invalid visualization type "{visType}"',
        values: {
          visType,
        },
      });
      throw new Error(errorMessage);
    }
    return type;
  }

  private getParams(params: VisParams) {
    return defaults({}, cloneDeep(params ?? {}), cloneDeep(this.type.visConfig?.defaults ?? {}));
  }

  async setState(state: PartialVisState) {
    let typeChanged = false;
    if (state.type && this.type.name !== state.type) {
      // @ts-ignore
      this.type = this.getType(state.type);
      typeChanged = true;
    }
    if (state.title !== undefined) {
      this.title = state.title;
    }
    if (state.description !== undefined) {
      this.description = state.description;
    }
    if (state.params || typeChanged) {
      this.params = this.getParams(state.params);
    }
    if (state.data && state.data.searchSource) {
      this.data.searchSource = await getSearch().searchSource.create(state.data.searchSource!);
      this.data.indexPattern = this.data.searchSource.getField('index');
    }
    if (state.data && state.data.savedSearchId) {
      this.data.savedSearchId = state.data.savedSearchId;
      if (this.data.searchSource) {
        this.data.searchSource = await getSearchSource(
          this.data.searchSource,
          this.data.savedSearchId
        );
        this.data.indexPattern = this.data.searchSource.getField('index');
      }
    }
    if (state.data && (state.data.aggs || !this.data.aggs)) {
      const aggs = state.data.aggs ? cloneDeep(state.data.aggs) : [];
      const configStates = this.initializeDefaultsFromSchemas(aggs, this.type.schemas.all || []);
      if (!this.data.indexPattern) {
        if (aggs.length) {
          const errorMessage = i18n.translate(
            'visualizations.initializeWithoutIndexPatternErrorMessage',
            {
              defaultMessage: 'Trying to initialize aggs without index pattern',
            }
          );
          throw new Error(errorMessage);
        }
        return;
      }
      this.data.aggs = getAggs().createAggConfigs(this.data.indexPattern, configStates);
    }
  }

  clone() {
    const { data, ...restOfSerialized } = this.serialize();
    const vis = new Vis(this.type.name, restOfSerialized as any);
    vis.setState({ ...restOfSerialized, data: {} });
    const aggs = this.data.indexPattern
      ? getAggs().createAggConfigs(this.data.indexPattern, data.aggs)
      : undefined;
    vis.data = {
      ...this.data,
      aggs,
    };
    return vis;
  }

  serialize(): SerializedVis {
    const aggs = this.data.aggs ? this.data.aggs.aggs.map((agg) => agg.toJSON()) : [];
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type.name,
      params: cloneDeep(this.params) as any,
      uiState: this.uiState.toJSON(),
      data: {
        aggs: aggs as any,
        searchSource: this.data.searchSource ? this.data.searchSource.getSerializedFields() : {},
        savedSearchId: this.data.savedSearchId,
      },
    };
  }

  // deprecated
  isHierarchical() {
    if (isFunction(this.type.hierarchicalData)) {
      return !!this.type.hierarchicalData(this);
    } else {
      return !!this.type.hierarchicalData;
    }
  }

  private initializeDefaultsFromSchemas(configStates: AggConfigOptions[], schemas: any) {
    // Set the defaults for any schema which has them. If the defaults
    // for some reason has more then the max only set the max number
    // of defaults (not sure why a someone define more...
    // but whatever). Also if a schema.name is already set then don't
    // set anything.
    const newConfigs = [...configStates];
    schemas
      .filter((schema: any) => Array.isArray(schema.defaults) && schema.defaults.length > 0)
      .filter(
        (schema: any) => !configStates.find((agg) => agg.schema && agg.schema === schema.name)
      )
      .forEach((schema: any) => {
        const defaultSchemaConfig = schema.defaults.slice(0, schema.max);
        defaultSchemaConfig.forEach((d: any) => newConfigs.push(d));
      });
    return newConfigs;
  }
}
