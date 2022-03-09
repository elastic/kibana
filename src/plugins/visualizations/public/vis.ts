/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { getTypes, getAggs, getSearch, getSavedObjects, getSpaces } from './services';
import { IAggConfigs, IndexPattern, ISearchSource, AggConfigSerialized } from '../../data/public';
import { BaseVisType } from './vis_types';
import { SerializedVis, SerializedVisData, VisParams } from '../common/types';

import { getSavedSearch, throwErrorOnSavedSearchUrlConflict } from '../../discover/public';

export type { SerializedVis, SerializedVisData };

export interface VisData {
  ast?: string;
  aggs?: IAggConfigs;
  indexPattern?: IndexPattern;
  searchSource?: ISearchSource;
  savedSearchId?: string;
}

const getSearchSource = async (inputSearchSource: ISearchSource, savedSearchId?: string) => {
  if (savedSearchId) {
    const savedSearch = await getSavedSearch(savedSearchId, {
      search: getSearch(),
      savedObjectsClient: getSavedObjects().client,
      spaces: getSpaces(),
    });

    await throwErrorOnSavedSearchUrlConflict(savedSearch);

    if (savedSearch?.searchSource) {
      inputSearchSource.setParent(savedSearch.searchSource);
    }
  }
  return inputSearchSource;
};

type PartialVisState = Assign<SerializedVis, { data: Partial<SerializedVisData> }>;

export class Vis<TVisParams = VisParams> {
  public readonly type: BaseVisType<TVisParams>;
  public readonly id?: string;
  public title: string = '';
  public description: string = '';
  public params: TVisParams;
  public data: VisData = {};

  public readonly uiState: PersistedState;

  constructor(visType: string, visState: SerializedVis<TVisParams> = {} as any) {
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

  async setState(inState: PartialVisState) {
    let state = inState;

    const { updateVisTypeOnParamsChange } = this.type;
    const newType = updateVisTypeOnParamsChange && updateVisTypeOnParamsChange(state.params);
    if (newType) {
      state = {
        ...inState,
        type: newType,
        params: { ...inState.params, type: newType },
      };
    }

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

  clone(): Vis<TVisParams> {
    const { data, ...restOfSerialized } = this.serialize();
    const vis = new Vis<TVisParams>(this.type.name, restOfSerialized as any);
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
    const aggs = this.data.aggs ? this.data.aggs.aggs.map((agg) => agg.serialize()) : [];
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type.name,
      params: cloneDeep(this.params),
      uiState: this.uiState.toJSON(),
      data: {
        aggs: aggs as any,
        searchSource: this.data.searchSource ? this.data.searchSource.getSerializedFields() : {},
        ...(this.data.savedSearchId ? { savedSearchId: this.data.savedSearchId } : {}),
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

  private initializeDefaultsFromSchemas(configStates: AggConfigSerialized[], schemas: any) {
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

// eslint-disable-next-line import/no-default-export
export default Vis;
