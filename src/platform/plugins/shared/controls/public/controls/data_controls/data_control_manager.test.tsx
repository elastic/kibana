/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { first, skip } from 'rxjs';
import { dataViewsService } from '../../services/kibana_services';
import { ControlGroupApi } from '../../control_group/types';
import { initializeDataControlManager } from './data_control_manager';

describe('initializeDataControlManager', () => {
  const dataControlState = {
    dataViewId: 'myDataViewId',
    fieldName: 'myFieldName',
  };
  const getEditorState = () => ({});
  const setEditorState = () => {};
  const controlGroupApi = {} as unknown as ControlGroupApi;

  dataViewsService.get = async (id: string): Promise<DataView> => {
    if (id !== 'myDataViewId') {
      throw new Error(`Simulated error: no data view found for id ${id}`);
    }
    return {
      id,
      getFieldByName: (fieldName: string) => {
        return [
          {
            displayName: 'My field name',
            name: 'myFieldName',
            type: 'string',
          },
        ].find((field) => fieldName === field.name);
      },
    } as unknown as DataView;
  };

  describe('dataViewId subscription', () => {
    describe('no blocking errors', () => {
      let dataControlManager: undefined | ReturnType<typeof initializeDataControlManager>;
      beforeAll((done) => {
        dataControlManager = initializeDataControlManager(
          'myControlId',
          'myControlType',
          dataControlState,
          getEditorState,
          setEditorState,
          controlGroupApi
        );

        dataControlManager.api.defaultTitle$!.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set data view', () => {
        const dataViews = dataControlManager!.api.dataViews$.value;
        expect(dataViews).not.toBeUndefined();
        expect(dataViews!.length).toBe(1);
        expect(dataViews![0].id).toBe('myDataViewId');
      });

      test('should set default panel title', () => {
        const defaultPanelTitle = dataControlManager!.api.defaultTitle$!.value;
        expect(defaultPanelTitle).not.toBeUndefined();
        expect(defaultPanelTitle).toBe('My field name');
      });
    });

    describe('data view does not exist', () => {
      let dataControlManager: undefined | ReturnType<typeof initializeDataControlManager>;
      beforeAll((done) => {
        dataControlManager = initializeDataControlManager(
          'myControlId',
          'myControlType',
          {
            ...dataControlState,
            dataViewId: 'notGonnaFindMeDataViewId',
          },
          getEditorState,
          setEditorState,
          controlGroupApi
        );

        dataControlManager.api.dataViews$.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set blocking error', () => {
        const error = dataControlManager!.api.blockingError$.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe(
          'Simulated error: no data view found for id notGonnaFindMeDataViewId'
        );
      });

      test('should clear blocking error when valid data view id provided', (done) => {
        dataControlManager!.api.dataViews$.pipe(skip(1), first()).subscribe((dataView) => {
          expect(dataView).not.toBeUndefined();
          expect(dataControlManager!.api.blockingError$.value).toBeUndefined();
          done();
        });
        dataControlManager!.api.setDataViewId('myDataViewId');
      });
    });

    describe('field does not exist', () => {
      let dataControlManager: undefined | ReturnType<typeof initializeDataControlManager>;
      beforeAll((done) => {
        dataControlManager = initializeDataControlManager(
          'myControlId',
          'myControlType',
          {
            ...dataControlState,
            fieldName: 'notGonnaFindMeFieldName',
          },
          getEditorState,
          setEditorState,
          controlGroupApi
        );

        dataControlManager!.api.defaultTitle$!.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set blocking error', () => {
        const error = dataControlManager!.api.blockingError$.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe('Could not locate field: notGonnaFindMeFieldName');
      });

      test('should clear blocking error when valid field name provided', (done) => {
        dataControlManager!.api.defaultTitle$!.pipe(skip(1), first()).subscribe((defaultTitle) => {
          expect(defaultTitle).toBe('My field name');
          expect(dataControlManager!.api.blockingError$.value).toBeUndefined();
          done();
        });
        dataControlManager!.api.setFieldName('myFieldName');
      });
    });
  });
});
