/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('Node debugging routes', () => {
    const cpuProfilePath = '/internal/node_debugging_routes/cpu_profile';
    const memoryProfilePath = '/internal/node_debugging_routes/memory_profile';

    describe('CPU profile route', () => {
      it('returns 200 and valid JSON profile with default duration', async () => {
        const response = await supertest.get(cpuProfilePath).expect(200);
        expect(response.body).to.be.an('object');
        expect(response.body).to.not.be(null);
        // CDP Profiler.stop profile shape: nodes array, startTime, endTime
        expect(response.body).to.have.property('nodes');
        expect(response.body.nodes).to.be.an('array');
        expect(response.body).to.have.property('startTime');
        expect(response.body).to.have.property('endTime');
        expect(response.headers['content-type']).to.match(/application\/json/);
      });

      it('returns 200 and valid JSON profile with duration query param', async () => {
        const response = await supertest.get(cpuProfilePath).query({ duration: 1 }).expect(200);
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('nodes');
        expect(response.body.nodes).to.be.an('array');
      });
    });

    describe('Memory profile route', () => {
      it('returns 200 and valid JSON sampling profile with default duration', async () => {
        const response = await supertest.get(memoryProfilePath).expect(200);
        expect(response.body).to.be.an('object');
        expect(response.body).to.not.be(null);
        // CDP HeapProfiler SamplingHeapProfile: head, samples
        expect(response.body).to.have.property('head');
        expect(response.body).to.have.property('samples');
        expect(response.body.samples).to.be.an('array');
        expect(response.headers['content-type']).to.match(/application\/json/);
      });

      it('returns 200 and valid JSON sampling profile with duration query param', async () => {
        const response = await supertest.get(memoryProfilePath).query({ duration: 1 }).expect(200);
        expect(response.body).to.be.an('object');
        expect(response.body).to.have.property('head');
        expect(response.body).to.have.property('samples');
        expect(response.body.samples).to.be.an('array');
      });
    });
  });
}
