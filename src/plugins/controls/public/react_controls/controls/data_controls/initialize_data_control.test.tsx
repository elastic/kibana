/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/public';
import { first, skip } from 'rxjs';
import { ControlGroupApi } from '../../control_group/types';
import { initializeDataControl } from './initialize_data_control';

describe('initializeDataControl', () => {
  const dataControlState = {
    dataViewId: 'myDataViewId',
    fieldName: 'myFieldName',
  };
  const editorStateManager = {};
  const controlGroupApi = {} as unknown as ControlGroupApi;
  const mockDataViews = dataViewPluginMocks.createStartContract();
  // @ts-ignore
  mockDataViews.get = async (id: string): Promise<DataView> => {
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
  const services = {
    core: coreMock.createStart(),
    dataViews: mockDataViews,
  };

  describe('dataViewId subscription', () => {
    describe('no blocking errors', () => {
      let dataControl: undefined | ReturnType<typeof initializeDataControl>;
      beforeAll((done) => {
        dataControl = initializeDataControl(
          'myControlId',
          'myControlType',
          'referenceNameSuffix',
          dataControlState,
          editorStateManager,
          controlGroupApi,
          services
        );

        dataControl.api.defaultPanelTitle!.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set data view', () => {
        const dataViews = dataControl!.api.dataViews.value;
        expect(dataViews).not.toBeUndefined();
        expect(dataViews!.length).toBe(1);
        expect(dataViews![0].id).toBe('myDataViewId');
      });

      test('should set default panel title', () => {
        const defaultPanelTitle = dataControl!.api.defaultPanelTitle!.value;
        expect(defaultPanelTitle).not.toBeUndefined();
        expect(defaultPanelTitle).toBe('My field name');
      });
    });

    describe('data view does not exist', () => {
      let dataControl: undefined | ReturnType<typeof initializeDataControl>;
      beforeAll((done) => {
        dataControl = initializeDataControl(
          'myControlId',
          'myControlType',
          'referenceNameSuffix',
          {
            ...dataControlState,
            dataViewId: 'notGonnaFindMeDataViewId',
          },
          editorStateManager,
          controlGroupApi,
          services
        );

        dataControl.api.dataViews.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set blocking error', () => {
        const error = dataControl!.api.blockingError.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe(
          'Simulated error: no data view found for id notGonnaFindMeDataViewId'
        );
      });

      test('should clear blocking error when valid data view id provided', (done) => {
        dataControl!.api.dataViews.pipe(skip(1), first()).subscribe((dataView) => {
          expect(dataView).not.toBeUndefined();
          expect(dataControl!.api.blockingError.value).toBeUndefined();
          done();
        });
        dataControl!.stateManager.dataViewId.next('myDataViewId');
      });
    });

    describe('field does not exist', () => {
      let dataControl: undefined | ReturnType<typeof initializeDataControl>;
      beforeAll((done) => {
        dataControl = initializeDataControl(
          'myControlId',
          'myControlType',
          'referenceNameSuffix',
          {
            ...dataControlState,
            fieldName: 'notGonnaFindMeFieldName',
          },
          editorStateManager,
          controlGroupApi,
          services
        );

        dataControl.api.defaultPanelTitle!.pipe(skip(1), first()).subscribe(() => {
          done();
        });
      });

      test('should set blocking error', () => {
        const error = dataControl!.api.blockingError.value;
        expect(error).not.toBeUndefined();
        expect(error!.message).toBe('Could not locate field: notGonnaFindMeFieldName');
      });

      test('should clear blocking error when valid field name provided', (done) => {
        dataControl!.api
          .defaultPanelTitle!.pipe(skip(1), first())
          .subscribe((defaultPanelTitle) => {
            expect(defaultPanelTitle).toBe('My field name');
            expect(dataControl!.api.blockingError.value).toBeUndefined();
            done();
          });
        dataControl!.stateManager.fieldName.next('myFieldName');
      });
    });
  });
});
