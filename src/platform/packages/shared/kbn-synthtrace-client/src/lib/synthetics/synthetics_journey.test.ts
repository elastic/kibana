/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BrowserJourneyStep } from '.';
import { syntheticsMonitor } from '.';

const START = new Date('2026-01-01T10:00:00.000Z').getTime();

const runJourney = (steps: BrowserJourneyStep[]) =>
  syntheticsMonitor
    .create()
    .name('Login flow')
    .configId('config-1')
    .location({ id: 'loc-1', label: 'Location 1' })
    .timestamp(START)
    .journey({ id: 'login', name: 'Login', checkGroup: 'check-group-1', steps })
    .flatMap((monitor) => monitor.serialize());

describe('syntheticsMonitor.journey', () => {
  describe('a successful run', () => {
    const docs = runJourney([
      { name: 'Go to login', durationUs: 2_000_000 },
      { name: 'Submit form', durationUs: 500_000 },
    ]);

    it('emits journey/start, one step/end per step and the summary, in order', () => {
      expect(docs.map((doc) => doc['synthetics.type'])).toEqual([
        'journey/start',
        'step/end',
        'step/end',
        'heartbeat/summary',
      ]);
    });

    it('shares the monitor, location and check group across all documents', () => {
      for (const doc of docs) {
        expect(doc).toMatchObject({
          'data_stream.dataset': 'browser',
          'monitor.type': 'browser',
          'monitor.name': 'Login flow',
          'monitor.check_group': 'check-group-1',
          config_id: 'config-1',
          'observer.name': 'loc-1',
          'observer.geo.name': 'Location 1',
          'synthetics.journey.id': 'login',
          'synthetics.journey.name': 'Login',
        });
      }
    });

    it('numbers steps from 1 and reports their name, status and duration', () => {
      const [, first, second] = docs;

      expect(first).toMatchObject({
        'synthetics.step.index': 1,
        'synthetics.step.name': 'Go to login',
        'synthetics.step.status': 'succeeded',
        'synthetics.step.duration.us': 2_000_000,
      });
      expect(second).toMatchObject({
        'synthetics.step.index': 2,
        'synthetics.step.name': 'Submit form',
        'synthetics.step.status': 'succeeded',
        'synthetics.step.duration.us': 500_000,
      });
    });

    it('spaces the documents by the step durations', () => {
      expect(docs.map((doc) => doc['@timestamp'])).toEqual([
        START,
        START + 2000,
        START + 2500,
        START + 2500,
      ]);
    });

    it('numbers the events sequentially', () => {
      expect(docs.slice(0, 3).map((doc) => doc['synthetics.index'])).toEqual([0, 1, 2]);
    });

    it('ends with an up summary that has the total duration and a state', () => {
      expect(docs[docs.length - 1]).toMatchObject({
        'monitor.status': 'up',
        'monitor.duration.us': 2_500_000,
        'summary.up': 1,
        'summary.down': 0,
        'state.status': 'up',
      });
      expect(docs[docs.length - 1]).toHaveProperty(['state.id']);
    });

    it('carries no check result on the start and step documents', () => {
      for (const doc of docs.slice(0, -1)) {
        expect(doc).not.toHaveProperty(['monitor.status']);
        expect(doc).not.toHaveProperty(['summary.up']);
        expect(doc).not.toHaveProperty(['state.status']);
      }
    });
  });

  describe('a run with a failed step', () => {
    const docs = runJourney([
      { name: 'Go to login', durationUs: 1_000_000 },
      { name: 'Submit form', durationUs: 3_000_000, error: 'locator.click: Timeout 3000ms' },
      { name: 'Open dashboard', durationUs: 1_000_000 },
    ]);

    it('marks the failing step and skips the following ones', () => {
      expect(docs.slice(1, 4).map((doc) => doc['synthetics.step.status'])).toEqual([
        'succeeded',
        'failed',
        'skipped',
      ]);
      expect(docs[3]['synthetics.step.duration.us']).toBe(0);
    });

    it('records the error on the failed step only', () => {
      expect(docs[2]).toMatchObject({
        'synthetics.error.message': 'locator.click: Timeout 3000ms',
        'synthetics.error.name': 'Error',
        'error.message': 'locator.click: Timeout 3000ms',
      });
      expect(docs[1]).not.toHaveProperty(['synthetics.error.message']);
      expect(docs[3]).not.toHaveProperty(['synthetics.error.message']);
    });

    it('ends with a down summary that carries the error and excludes skipped time', () => {
      expect(docs[docs.length - 1]).toMatchObject({
        'monitor.status': 'down',
        'monitor.duration.us': 4_000_000,
        'summary.up': 0,
        'summary.down': 1,
        'state.status': 'down',
        'error.message': 'locator.click: Timeout 3000ms',
      });
    });
  });

  it('uses a one second default step duration', () => {
    const docs = runJourney([{ name: 'Only step' }]);

    expect(docs[1]['synthetics.step.duration.us']).toBe(1_000_000);
  });

  it('drops a check result set on the monitor before expanding it', () => {
    const docs = syntheticsMonitor
      .create()
      .configId('config-1')
      .timestamp(START)
      .down()
      .journey({ id: 'j', name: 'J', checkGroup: 'cg', steps: [{ name: 'Step' }] })
      .flatMap((monitor) => monitor.serialize());

    expect(docs[docs.length - 1]).toMatchObject({ 'monitor.status': 'up', 'summary.up': 1 });
    expect(docs[1]).not.toHaveProperty(['monitor.status']);
  });

  it('does not modify the monitor it is called on', () => {
    const monitor = syntheticsMonitor.create().configId('config-1').timestamp(START);
    const before = { ...monitor.fields };

    monitor.journey({ id: 'j', name: 'J', checkGroup: 'cg', steps: [{ name: 'Step' }] });

    expect(monitor.fields).toEqual(before);
  });

  it('requires a timestamp', () => {
    expect(() =>
      syntheticsMonitor.create().journey({ id: 'j', name: 'J', checkGroup: 'cg', steps: [] })
    ).toThrow('timestamp() must be set before calling journey()');
  });
});
