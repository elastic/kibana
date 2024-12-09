/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip } from 'rxjs';
import { PhaseTracker } from './phase_tracker';

describe('PhaseTracker', () => {
  describe('api does not implement PublishesDataLoading or PublishesRendered', () => {
    test(`should emit 'rendered' event`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('rendered');
          done();
        });
      phaseTracker.trackPhaseEvents('1', {});
    });
  });

  describe('api implements PublishesDataLoading', () => {
    test(`should emit 'loading' event when dataLoading is true`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('loading');
          done();
        });
      phaseTracker.trackPhaseEvents('1', { dataLoading: new BehaviorSubject(true) });
    });

    test(`should emit 'rendered' event when dataLoading is false`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('rendered');
          done();
        });
      phaseTracker.trackPhaseEvents('1', { dataLoading: new BehaviorSubject(false) });
    });
  });

  describe('api implements PublishesDataLoading and PublishesRendered', () => {
    test(`should emit 'loading' event when dataLoading is true`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('loading');
          done();
        });
      phaseTracker.trackPhaseEvents('1', {
        dataLoading: new BehaviorSubject(true),
        rendered$: new BehaviorSubject(false),
      });
    });

    test(`should emit 'loading' event when dataLoading is false but rendered is false`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('loading');
          done();
        });
      phaseTracker.trackPhaseEvents('1', {
        dataLoading: new BehaviorSubject(false),
        rendered$: new BehaviorSubject(false),
      });
    });

    test(`should emit 'rendered' event only when rendered is true`, (done) => {
      const phaseTracker = new PhaseTracker();
      phaseTracker
        .getPhase$()
        .pipe(skip(1))
        .subscribe((phaseEvent) => {
          expect(phaseEvent?.status).toBe('rendered');
          done();
        });
      phaseTracker.trackPhaseEvents('1', {
        dataLoading: new BehaviorSubject(false),
        rendered$: new BehaviorSubject(true),
      });
    });
  });
});
