/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { arrayMapsAreEqual, setMapsAreEqual, setsAreEqual } from './saved_objects_test_utils';

describe('savedObjects/testUtils', () => {
  describe('#setsAreEqual', () => {
    const setA = new Set(['1', '2', '3']);
    const setB = new Set(['1', '2']);
    const setC = new Set(['1', '3', '4']);
    const setD = new Set(['2', '3', '1']);

    describe('inequal', () => {
      it('should return false if the sets are not the same size', () => {
        expect(setsAreEqual(setA, setB)).toBeFalsy();
        expect(setsAreEqual(setB, setA)).toBeFalsy();
        expect(setsAreEqual(setA, new Set())).toBeFalsy();
        expect(setsAreEqual(new Set(), setA)).toBeFalsy();
      });

      it('should return false if the sets do not have the same values', () => {
        expect(setsAreEqual(setA, setC)).toBeFalsy();
        expect(setsAreEqual(setC, setA)).toBeFalsy();
      });
    });

    describe('equal', () => {
      it('should return true if the sets are exactly the same', () => {
        expect(setsAreEqual(setA, setD)).toBeTruthy();
        expect(setsAreEqual(setD, setA)).toBeTruthy();
        expect(setsAreEqual(new Set(), new Set())).toBeTruthy();
      });
    });
  });

  describe('#arrayMapsAreEqual', () => {
    const mapA = new Map<string, string[]>();
    mapA.set('a', ['1', '2', '3']);
    mapA.set('b', ['1', '2']);

    const mapB = new Map<string, string[]>();
    mapB.set('a', ['1', '2', '3']);

    const mapC = new Map<string, string[]>();
    mapC.set('a', ['1', '2', '3']);
    mapC.set('c', ['1', '2']);

    const mapD = new Map<string, string[]>();
    mapD.set('a', ['1', '2', '3']);
    mapD.set('b', ['1', '3']);

    const mapE = new Map<string, string[]>();
    mapE.set('b', ['2', '1']);
    mapE.set('a', ['3', '1', '2']);

    const mapF = new Map<string, string[] | undefined>();
    mapF.set('a', ['1', '2', '3']);
    mapF.set('b', undefined);

    const mapG = new Map<string, string[] | undefined>();
    mapG.set('b', undefined);
    mapG.set('a', ['3', '1', '2']);

    const mapH = new Map<string, string[] | undefined>();
    mapF.set('a', ['1', '2', '3']);
    mapF.set('b', []);

    const mapI = new Map<string, string[] | undefined>();
    mapG.set('b', []);
    mapG.set('a', ['3', '1', '2']);

    describe('inequal', () => {
      it('should return false if the maps are not the same size', () => {
        expect(arrayMapsAreEqual(mapA, mapB)).toBeFalsy();
        expect(arrayMapsAreEqual(mapB, mapA)).toBeFalsy();
        expect(arrayMapsAreEqual(mapA, new Map())).toBeFalsy();
        expect(arrayMapsAreEqual(new Map(), mapA)).toBeFalsy();
      });

      it('should return false if the maps do not have the same keys', () => {
        expect(arrayMapsAreEqual(mapA, mapC)).toBeFalsy();
        expect(arrayMapsAreEqual(mapC, mapA)).toBeFalsy();
      });

      it('should return false if the maps do not have the same values', () => {
        expect(arrayMapsAreEqual(mapA, mapD)).toBeFalsy();
        expect(arrayMapsAreEqual(mapD, mapA)).toBeFalsy();
        expect(arrayMapsAreEqual(mapA, mapF)).toBeFalsy();
        expect(arrayMapsAreEqual(mapF, mapA)).toBeFalsy();
        expect(arrayMapsAreEqual(mapA, mapH)).toBeFalsy();
        expect(arrayMapsAreEqual(mapH, mapA)).toBeFalsy();
      });
    });

    describe('equal', () => {
      it('should return true if the maps are exactly the same', () => {
        expect(arrayMapsAreEqual(mapA, mapE)).toBeTruthy();
        expect(arrayMapsAreEqual(mapE, mapA)).toBeTruthy();
        expect(arrayMapsAreEqual(new Map(), new Map())).toBeTruthy();
        expect(arrayMapsAreEqual(mapF, mapG)).toBeTruthy();
        expect(arrayMapsAreEqual(mapG, mapF)).toBeTruthy();
        expect(arrayMapsAreEqual(mapH, mapI)).toBeTruthy();
        expect(arrayMapsAreEqual(mapI, mapH)).toBeTruthy();
      });
    });
  });

  describe('#setMapsAreEqual', () => {
    const mapA = new Map<string, Set<string>>();
    mapA.set('a', new Set(['1', '2', '3']));
    mapA.set('b', new Set(['1', '2']));

    const mapB = new Map<string, Set<string>>();
    mapB.set('a', new Set(['1', '2', '3']));

    const mapC = new Map<string, Set<string>>();
    mapC.set('a', new Set(['1', '2', '3']));
    mapC.set('c', new Set(['1', '2']));

    const mapD = new Map<string, Set<string>>();
    mapD.set('a', new Set(['1', '2', '3']));
    mapD.set('b', new Set(['1', '3']));

    const mapE = new Map<string, Set<string>>();
    mapE.set('b', new Set(['2', '1']));
    mapE.set('a', new Set(['3', '1', '2']));

    describe('inequal', () => {
      it('should return false if the maps are not the same size', () => {
        expect(setMapsAreEqual(mapA, mapB)).toBeFalsy();
        expect(setMapsAreEqual(mapB, mapA)).toBeFalsy();
        expect(setMapsAreEqual(mapA, new Map())).toBeFalsy();
        expect(setMapsAreEqual(new Map(), mapA)).toBeFalsy();
      });

      it('should return false if the maps do not have the same keys', () => {
        expect(setMapsAreEqual(mapA, mapC)).toBeFalsy();
        expect(setMapsAreEqual(mapC, mapA)).toBeFalsy();
      });

      it('should return false if the maps do not have the same values', () => {
        expect(setMapsAreEqual(mapA, mapD)).toBeFalsy();
        expect(setMapsAreEqual(mapD, mapA)).toBeFalsy();
      });
    });

    describe('equal', () => {
      it('should return true if the maps are exactly the same', () => {
        expect(setMapsAreEqual(mapA, mapE)).toBeTruthy();
        expect(setMapsAreEqual(mapE, mapA)).toBeTruthy();
        expect(setMapsAreEqual(new Map(), new Map())).toBeTruthy();
      });
    });
  });
});
