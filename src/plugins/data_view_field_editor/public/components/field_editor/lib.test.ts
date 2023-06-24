/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldPreviewChanges } from './lib';
import { BehaviorSubject } from 'rxjs';
import { ChangeType, FieldPreview } from '../preview/types';

const parentName = 'composite.field';

const appendParentName = (key: string) => `${parentName}.${key}`;

describe('getFieldPreviewChanges', () => {
  it('should return new keys', (done) => {
    const subj = new BehaviorSubject<FieldPreview[] | undefined>(undefined);
    const changes = getFieldPreviewChanges(subj, parentName);
    changes.subscribe((change) => {
      expect(change).toStrictEqual({
        hello: { changeType: ChangeType.UPSERT, type: 'keyword' },
      });
      done();
    });
    subj.next([]);
    subj.next([{ key: appendParentName('hello'), value: 'world', type: 'keyword' }]);
  });

  it('should return updated type', (done) => {
    const subj = new BehaviorSubject<FieldPreview[] | undefined>(undefined);
    const changes = getFieldPreviewChanges(subj, parentName);
    changes.subscribe((change) => {
      expect(change).toStrictEqual({ hello: { changeType: ChangeType.UPSERT, type: 'long' } });
      done();
    });
    subj.next([{ key: appendParentName('hello'), value: 'world', type: 'keyword' }]);
    subj.next([{ key: appendParentName('hello'), value: 1, type: 'long' }]);
  });

  it('should remove keys', (done) => {
    const subj = new BehaviorSubject<FieldPreview[] | undefined>(undefined);
    const changes = getFieldPreviewChanges(subj, parentName);
    changes.subscribe((change) => {
      expect(change).toStrictEqual({ hello: { changeType: ChangeType.DELETE } });
      done();
    });
    subj.next([{ key: appendParentName('hello'), value: 'world', type: 'keyword' }]);
    subj.next([]);
  });

  it('should add, update, and remove keys in a single change', (done) => {
    const subj = new BehaviorSubject<FieldPreview[] | undefined>(undefined);
    const changes = getFieldPreviewChanges(subj, parentName);
    changes.subscribe((change) => {
      expect(change).toStrictEqual({
        hello: { changeType: ChangeType.UPSERT, type: 'long' },
        hello2: { changeType: ChangeType.DELETE },
        hello3: { changeType: ChangeType.UPSERT, type: 'keyword' },
      });
      done();
    });
    subj.next([
      { key: appendParentName('hello'), value: 'world', type: 'keyword' },
      { key: appendParentName('hello2'), value: 'world', type: 'keyword' },
    ]);
    subj.next([
      { key: appendParentName('hello'), value: 1, type: 'long' },
      { key: appendParentName('hello3'), value: 'world', type: 'keyword' },
    ]);
  });
});
