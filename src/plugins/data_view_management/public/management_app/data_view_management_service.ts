/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IUiSettingsClient, ApplicationStart } from '@kbn/core/public';
import { BehaviorSubject, Observable, map, distinctUntilChanged } from 'rxjs';

import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

import {
  SavedObjectsManagementPluginStart,
  SavedObjectManagementTypeInfo,
  SavedObjectRelation,
} from '@kbn/saved-objects-management-plugin/public';

import {
  DataViewsServicePublic,
  INDEX_PATTERN_TYPE,
  DataViewField,
  DataViewLazy,
} from '@kbn/data-views-plugin/public';

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';

import { getTags } from '../components/utils';

import { APP_STATE_STORAGE_KEY } from '../components/edit_index_pattern/edit_index_pattern_state_container';

export interface SavedObjectRelationWithTitle extends SavedObjectRelation {
  title: string;
}

export type BehaviorObservable<T> = Omit<BehaviorSubject<T>, 'next'>;

export const matchedIndiciesDefault = {
  allIndices: [],
  exactMatchedIndices: [],
  partialMatchedIndices: [],
  visibleIndices: [],
};

/**
 * ConstructorArgs for DataViewEditorService
 */
export interface DataViewMgmtServiceConstructorArgs {
  /**
   * Dependencies for the DataViewEditorService
   */
  services: {
    application: ApplicationStart;
    dataViews: DataViewsServicePublic;
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    uiSettings: IUiSettingsClient;
  };
  /**
   * Whether service requires requireTimestampField
   */
  requireTimestampField?: boolean;
  /**
   * Initial type, indexPattern, and name to populate service
   */
  initialValues: {
    name?: string;
    type?: INDEX_PATTERN_TYPE;
    indexPattern?: string;
  };
}

export interface DataViewMgmtState {
  dataView?: DataViewLazy;
  allowedTypes: SavedObjectManagementTypeInfo[];
  relationships: SavedObjectRelationWithTitle[];
  fields: DataViewField[];
  scriptedFields: DataViewField[];
  scriptedFieldLangs: string[];
  indexedFieldTypes: string[];
  fieldConflictCount: number;
  tags: Array<{ key: string; 'data-test-subj': string; name: string }>;
  isRefreshing: boolean;
  defaultIndex: string;
  conflictFieldsUrl: string;
}

const defaultDataViewEditorState: DataViewMgmtState = {
  allowedTypes: [],
  relationships: [],
  fields: [],
  scriptedFields: [],
  scriptedFieldLangs: [],
  indexedFieldTypes: [],
  fieldConflictCount: 0,
  tags: [],
  isRefreshing: true,
  defaultIndex: '',
  conflictFieldsUrl: '',
};

export const stateSelectorFactory =
  <S>(state$: Observable<S>) =>
  <R>(selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean) =>
    state$.pipe(map(selector), distinctUntilChanged(equalityFn));

export class DataViewMgmtService {
  constructor({
    services: { dataViews, savedObjectsManagement, uiSettings, application },
    initialValues: {},
  }: DataViewMgmtServiceConstructorArgs) {
    this.services = {
      application,
      dataViews,
      savedObjectsManagement,
      uiSettings,
    };

    this.internalState$ = new BehaviorSubject<DataViewMgmtState>({
      ...defaultDataViewEditorState,
    });

    this.state$ = this.internalState$ as BehaviorObservable<DataViewMgmtState>;

    // todo look at updates
    /*
    uiSettings.get('defaultIndex').then((defaultIndex: string) => {
      this.updateState({ defaultIndex });
    });
    */

    // allowed types are set once and never change
    this.allowedTypes = new Promise((resolve) => {
      savedObjectsManagement.getAllowedTypes().then((resp) => {
        resolve(resp);
      });
    });
  }

  private services: {
    application: ApplicationStart;
    dataViews: DataViewsServicePublic;
    savedObjectsManagement: SavedObjectsManagementPluginStart;
    uiSettings: IUiSettingsClient;
  };

  private allowedTypes: Promise<SavedObjectManagementTypeInfo[]>;

  private internalState$: BehaviorSubject<DataViewMgmtState>;
  state$: BehaviorObservable<DataViewMgmtState>;

  private updateState = (newState: Partial<DataViewMgmtState>) => {
    this.internalState$.next({ ...this.state$.getValue(), ...newState });
  };

  private getKbnUrl = (dataViewId: string) =>
    setStateToKbnUrl(
      APP_STATE_STORAGE_KEY,
      {
        fieldTypes: ['conflict'],
        tab: 'indexedFields',
      },
      { useHash: this.services.uiSettings.get('state:storeInSessionStorage') },
      this.services.application.getUrlForApp('management', {
        path: `/kibana/dataViews/dataView/${encodeURIComponent(dataViewId)}`,
      })
    );

  private getTags = async (dataView: DataViewLazy) => {
    if (dataView) {
      const defaultIndex = await this.services.uiSettings.get('defaultIndex'); // todo use const
      const tags = getTags(
        dataView,
        dataView.id === defaultIndex,
        this.services.dataViews.getRollupsEnabled()
      );

      return tags;
    }
    return [];
  };

  async updateScriptedFields() {
    const dataView = this.state$.getValue().dataView;
    if (dataView) {
      const scriptedFieldRecords = dataView.getScriptedFields({ fieldName: ['*'] });
      const scriptedFields = Object.values(scriptedFieldRecords);

      const scriptedFieldLangs = Array.from(
        scriptedFields.reduce((acc: Set<string>, field) => {
          if (field.lang) {
            acc.add(field.lang);
          }
          return acc;
        }, new Set<string>())
      );

      this.updateState({
        scriptedFields,
        scriptedFieldLangs,
      });
    }
  }

  async setDataView(dataView: DataViewLazy) {
    this.updateState({ isRefreshing: true });
    // todo this should probably load the data view here
    const fieldRecords = (
      await dataView.getFields({ scripted: false, fieldName: ['*'] })
    ).getFieldMapSorted();

    const fields = Object.values(fieldRecords);
    const indexedFieldTypes: string[] = [];
    fields.forEach((field) => {
      // for conflicted fields, add conflict as a type
      if (field.type === 'conflict') {
        indexedFieldTypes.push('conflict');
      }
      if (field.esTypes) {
        // add all types, may be multiple
        field.esTypes.forEach((item) => indexedFieldTypes.push(item));
      }
    });

    const allowedAsString = (await this.allowedTypes).map((item) => item.name);

    this.services.savedObjectsManagement
      .getRelationships(DATA_VIEW_SAVED_OBJECT_TYPE, dataView.id!, allowedAsString)
      .then((resp) => {
        this.updateState({
          relationships: resp.relations.map((r) => ({ ...r, title: r.meta.title! })),
        });
      });

    this.updateScriptedFields();

    this.updateState({
      dataView,
      fields,
      indexedFieldTypes,
      fieldConflictCount: fields.filter((field) => field.type === 'conflict').length,
      tags: await this.getTags(dataView),
      isRefreshing: false,
      conflictFieldsUrl: this.getKbnUrl(dataView.id!),
      scriptedFields: Object.values(dataView.getScriptedFields({ fieldName: ['*'] })),
    });
  }

  refreshFields() {
    const dataView = this.state$.getValue().dataView;
    if (dataView) {
      return this.setDataView(dataView);
    }
  }

  async setDefaultDataView() {
    const dataView = this.internalState$.getValue().dataView;
    if (!dataView) {
      return;
    }
    await this.services.uiSettings.set('defaultIndex', dataView.id);

    this.updateState({ tags: await this.getTags(dataView) });
  }
}
