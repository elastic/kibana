/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import _ from 'lodash';
import d3 from 'd3';
import chrome from '../../../chrome';
import { seedColors } from '../../../vis/components/color/seed_colors';
import { vislibColor as getColors } from '../../components/color/color';
import { mappedColors } from '../../components/color/mapped_colors';
import { createColorPalette } from '../../components/color/color_palette';

const config = chrome.getUiSettingsClient();

describe('Vislib Color Module Test Suite', function() {
  describe('Color (main)', function() {
    let previousConfig;
    const arr = ['good', 'better', 'best', 'never', 'let', 'it', 'rest'];
    const arrayOfNumbers = [1, 2, 3, 4, 5];
    const arrayOfUndefinedValues = [undefined, undefined, undefined];
    const arrayOfObjects = [{}, {}, {}];
    const arrayOfBooleans = [true, false, true];
    const arrayOfNullValues = [null, null, null];
    const emptyObject = {};
    const nullValue = null;
    let notAValue;
    let color;

    beforeEach(ngMock.module('kibana'));
    beforeEach(() => {
      previousConfig = config.get('visualization:colorMapping');
      config.set('visualization:colorMapping', {});
      color = getColors(arr, {});
    });

    afterEach(() => {
      config.set('visualization:colorMapping', previousConfig);
    });

    it('should throw an error if input is not an array', function() {
      expect(function() {
        getColors(200);
      }).to.throwError();

      expect(function() {
        getColors('help');
      }).to.throwError();

      expect(function() {
        getColors(true);
      }).to.throwError();

      expect(function() {
        getColors(notAValue);
      }).to.throwError();

      expect(function() {
        getColors(nullValue);
      }).to.throwError();

      expect(function() {
        getColors(emptyObject);
      }).to.throwError();
    });

    describe('when array is not composed of numbers, strings, or undefined values', function() {
      it('should throw an error', function() {
        expect(function() {
          getColors(arrayOfObjects);
        }).to.throwError();

        expect(function() {
          getColors(arrayOfBooleans);
        }).to.throwError();

        expect(function() {
          getColors(arrayOfNullValues);
        }).to.throwError();
      });
    });

    describe('when input is an array of strings, numbers, or undefined values', function() {
      it('should not throw an error', function() {
        expect(function() {
          getColors(arr);
        }).to.not.throwError();

        expect(function() {
          getColors(arrayOfNumbers);
        }).to.not.throwError();

        expect(function() {
          getColors(arrayOfUndefinedValues);
        }).to.not.throwError();
      });
    });

    it('should be a function', function() {
      expect(typeof getColors).to.be('function');
    });

    it('should return a function', function() {
      expect(typeof color).to.be('function');
    });

    it('should return the first hex color in the seed colors array', function() {
      expect(color(arr[0])).to.be(seedColors[0]);
    });

    it('should return the value from the mapped colors', function() {
      expect(color(arr[1])).to.be(mappedColors.get(arr[1]));
    });

    it('should return the value from the specified color mapping overrides', function() {
      const colorFn = getColors(arr, { good: 'red' });
      expect(colorFn('good')).to.be('red');
    });
  });

  describe('Seed Colors', function() {
    it('should return an array', function() {
      expect(seedColors instanceof Array).to.be(true);
    });
  });

  describe('Mapped Colors', () => {
    let previousConfig;

    beforeEach(ngMock.module('kibana'));
    beforeEach(() => {
      previousConfig = config.get('visualization:colorMapping');
      mappedColors.mapping = {};
    });

    afterEach(() => {
      config.set('visualization:colorMapping', previousConfig);
    });

    it('should properly map keys to unique colors', () => {
      config.set('visualization:colorMapping', {});

      const arr = [1, 2, 3, 4, 5];
      mappedColors.mapKeys(arr);
      expect(
        _(mappedColors.mapping)
          .values()
          .uniq()
          .size()
      ).to.be(arr.length);
    });

    it('should not include colors used by the config', () => {
      const newConfig = { bar: seedColors[0] };
      config.set('visualization:colorMapping', newConfig);

      const arr = ['foo', 'baz', 'qux'];
      mappedColors.mapKeys(arr);

      const colorValues = _(mappedColors.mapping).values();
      expect(colorValues.contains(seedColors[0])).to.be(false);
      expect(colorValues.uniq().size()).to.be(arr.length);
    });

    it('should create a unique array of colors even when config is set', () => {
      const newConfig = { bar: seedColors[0] };
      config.set('visualization:colorMapping', newConfig);

      const arr = ['foo', 'bar', 'baz', 'qux'];
      mappedColors.mapKeys(arr);

      const expectedSize = _(arr)
        .difference(_.keys(newConfig))
        .size();
      expect(
        _(mappedColors.mapping)
          .values()
          .uniq()
          .size()
      ).to.be(expectedSize);
      expect(mappedColors.get(arr[0])).to.not.be(seedColors[0]);
    });

    it('should treat different formats of colors as equal', () => {
      const color = d3.rgb(seedColors[0]);
      const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
      const newConfig = { bar: rgb };
      config.set('visualization:colorMapping', newConfig);

      const arr = ['foo', 'bar', 'baz', 'qux'];
      mappedColors.mapKeys(arr);

      const expectedSize = _(arr)
        .difference(_.keys(newConfig))
        .size();
      expect(
        _(mappedColors.mapping)
          .values()
          .uniq()
          .size()
      ).to.be(expectedSize);
      expect(mappedColors.get(arr[0])).to.not.be(seedColors[0]);
      expect(mappedColors.get('bar')).to.be(seedColors[0]);
    });

    it('should have a flush method that moves the current map to the old map', function() {
      const arr = [1, 2, 3, 4, 5];
      mappedColors.mapKeys(arr);
      expect(_.keys(mappedColors.mapping).length).to.be(5);
      expect(_.keys(mappedColors.oldMap).length).to.be(0);

      mappedColors.flush();

      expect(_.keys(mappedColors.oldMap).length).to.be(5);
      expect(_.keys(mappedColors.mapping).length).to.be(0);

      mappedColors.flush();

      expect(_.keys(mappedColors.oldMap).length).to.be(0);
      expect(_.keys(mappedColors.mapping).length).to.be(0);
    });

    it('should use colors in the oldMap if they are available', function() {
      const arr = [1, 2, 3, 4, 5];
      mappedColors.mapKeys(arr);
      expect(_.keys(mappedColors.mapping).length).to.be(5);
      expect(_.keys(mappedColors.oldMap).length).to.be(0);

      mappedColors.flush();

      mappedColors.mapKeys([3, 4, 5]);
      expect(_.keys(mappedColors.oldMap).length).to.be(5);
      expect(_.keys(mappedColors.mapping).length).to.be(3);

      expect(mappedColors.mapping[1]).to.be(undefined);
      expect(mappedColors.mapping[2]).to.be(undefined);
      expect(mappedColors.mapping[3]).to.equal(mappedColors.oldMap[3]);
      expect(mappedColors.mapping[4]).to.equal(mappedColors.oldMap[4]);
      expect(mappedColors.mapping[5]).to.equal(mappedColors.oldMap[5]);
    });

    it('should have a purge method that clears both maps', function() {
      const arr = [1, 2, 3, 4, 5];
      mappedColors.mapKeys(arr);
      mappedColors.flush();
      mappedColors.mapKeys(arr);

      expect(_.keys(mappedColors.mapping).length).to.be(5);
      expect(_.keys(mappedColors.oldMap).length).to.be(5);

      mappedColors.purge();

      expect(_.keys(mappedColors.mapping).length).to.be(0);
      expect(_.keys(mappedColors.oldMap).length).to.be(0);
    });
  });

  describe('Color Palette', function() {
    const num1 = 45;
    const num2 = 72;
    const num3 = 90;
    const string = 'Welcome';
    const bool = true;
    const nullValue = null;
    const emptyArr = [];
    const emptyObject = {};
    let notAValue;
    let colorPalette;

    beforeEach(ngMock.module('kibana'));
    beforeEach(
      ngMock.inject(function() {
        colorPalette = createColorPalette(num1);
      })
    );

    it('should throw an error if input is not a number', function() {
      expect(function() {
        createColorPalette(string);
      }).to.throwError();

      expect(function() {
        createColorPalette(bool);
      }).to.throwError();

      expect(function() {
        createColorPalette(nullValue);
      }).to.throwError();

      expect(function() {
        createColorPalette(emptyArr);
      }).to.throwError();

      expect(function() {
        createColorPalette(emptyObject);
      }).to.throwError();

      expect(function() {
        createColorPalette(notAValue);
      }).to.throwError();
    });

    it('should be a function', function() {
      expect(typeof createColorPalette).to.be('function');
    });

    it('should return an array', function() {
      expect(colorPalette instanceof Array).to.be(true);
    });

    it('should return an array of the same length as the input', function() {
      expect(colorPalette.length).to.be(num1);
    });

    it('should return the seed color array when input length is 72', function() {
      expect(createColorPalette(num2)[71]).to.be(seedColors[71]);
    });

    it('should return an array of the same length as the input when input is greater than 72', function() {
      expect(createColorPalette(num3).length).to.be(num3);
    });

    it('should create new darker colors when input is greater than 72', function() {
      expect(createColorPalette(num3)[72]).not.to.equal(seedColors[0]);
    });
  });
});
