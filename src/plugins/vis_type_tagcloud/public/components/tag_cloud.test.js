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

import _ from 'lodash';
import d3 from 'd3';
import 'jest-canvas-mock';

import { fromNode, delay } from 'bluebird';
import { TagCloud } from './tag_cloud';
import { setHTMLElementOffset, setSVGElementGetBBox } from '../../../../test_utils/public';

describe('tag cloud tests', () => {
  let SVGElementGetBBoxSpyInstance;
  let HTMLElementOffsetMockInstance;

  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    SVGElementGetBBoxSpyInstance.mockRestore();
    HTMLElementOffsetMockInstance.mockRestore();
  });

  const minValue = 1;
  const maxValue = 9;
  const midValue = (minValue + maxValue) / 2;
  const baseTest = {
    data: [
      { rawText: 'foo', displayText: 'foo', value: minValue },
      { rawText: 'bar', displayText: 'bar', value: midValue },
      { rawText: 'foobar', displayText: 'foobar', value: maxValue },
    ],
    options: {
      orientation: 'single',
      scale: 'linear',
      minFontSize: 10,
      maxFontSize: 36,
    },
    expected: [
      {
        text: 'foo',
        fontSize: '10px',
      },
      {
        text: 'bar',
        fontSize: '23px',
      },
      {
        text: 'foobar',
        fontSize: '36px',
      },
    ],
  };

  const singleLayoutTest = _.cloneDeep(baseTest);

  const rightAngleLayoutTest = _.cloneDeep(baseTest);
  rightAngleLayoutTest.options.orientation = 'right angled';

  const multiLayoutTest = _.cloneDeep(baseTest);
  multiLayoutTest.options.orientation = 'multiple';

  const mapWithLog = d3.scale.log();
  mapWithLog.range([baseTest.options.minFontSize, baseTest.options.maxFontSize]);
  mapWithLog.domain([minValue, maxValue]);
  const logScaleTest = _.cloneDeep(baseTest);
  logScaleTest.options.scale = 'log';
  logScaleTest.expected[1].fontSize = Math.round(mapWithLog(midValue)) + 'px';

  const mapWithSqrt = d3.scale.sqrt();
  mapWithSqrt.range([baseTest.options.minFontSize, baseTest.options.maxFontSize]);
  mapWithSqrt.domain([minValue, maxValue]);
  const sqrtScaleTest = _.cloneDeep(baseTest);
  sqrtScaleTest.options.scale = 'square root';
  sqrtScaleTest.expected[1].fontSize = Math.round(mapWithSqrt(midValue)) + 'px';

  const biggerFontTest = _.cloneDeep(baseTest);
  biggerFontTest.options.minFontSize = 36;
  biggerFontTest.options.maxFontSize = 72;
  biggerFontTest.expected[0].fontSize = '36px';
  biggerFontTest.expected[1].fontSize = '54px';
  biggerFontTest.expected[2].fontSize = '72px';

  const trimDataTest = _.cloneDeep(baseTest);
  trimDataTest.data.splice(1, 1);
  trimDataTest.expected.splice(1, 1);

  let domNode;
  let tagCloud;

  const colorScale = d3.scale
    .ordinal()
    .range(['#00a69b', '#57c17b', '#6f87d8', '#663db8', '#bc52bc', '#9e3533', '#daa05d']);

  function setupDOM() {
    domNode = document.createElement('div');
    SVGElementGetBBoxSpyInstance = setSVGElementGetBBox();
    HTMLElementOffsetMockInstance = setHTMLElementOffset(512, 512);

    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }

  [
    singleLayoutTest,
    rightAngleLayoutTest,
    multiLayoutTest,
    logScaleTest,
    sqrtScaleTest,
    biggerFontTest,
    trimDataTest,
  ].forEach(function (currentTest) {
    describe(`should position elements correctly for options: ${JSON.stringify(
      currentTest.options
    )}`, () => {
      beforeEach(async () => {
        tagCloud = new TagCloud(domNode, colorScale);
        tagCloud.setData(currentTest.data);
        tagCloud.setOptions(currentTest.options);
        await fromNode((cb) => tagCloud.once('renderComplete', cb));
      });

      afterEach(teardownDOM);

      test(
        'completeness should be ok',
        handleExpectedBlip(() => {
          expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
        })
      );

      test(
        'positions should be ok',
        handleExpectedBlip(() => {
          const textElements = domNode.querySelectorAll('text');
          verifyTagProperties(currentTest.expected, textElements, tagCloud);
        })
      );
    });
  });

  [5, 100, 200, 300, 500].forEach((timeout) => {
    describe(`should only send single renderComplete event at the very end, using ${timeout}ms timeout`, () => {
      beforeEach(async () => {
        //TagCloud takes at least 600ms to complete (due to d3 animation)
        //renderComplete should only notify at the last one
        tagCloud = new TagCloud(domNode, colorScale);
        tagCloud.setData(baseTest.data);
        tagCloud.setOptions(baseTest.options);

        //this timeout modifies the settings before the cloud is rendered.
        //the cloud needs to use the correct options
        setTimeout(() => tagCloud.setOptions(logScaleTest.options), timeout);
        await fromNode((cb) => tagCloud.once('renderComplete', cb));
      });

      afterEach(teardownDOM);

      test(
        'completeness should be ok',
        handleExpectedBlip(() => {
          expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
        })
      );

      test(
        'positions should be ok',
        handleExpectedBlip(() => {
          const textElements = domNode.querySelectorAll('text');
          verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
        })
      );
    });
  });

  describe('should use the latest state before notifying (when modifying options multiple times)', () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      tagCloud.setOptions(logScaleTest.options);
      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test(
      'completeness should be ok',
      handleExpectedBlip(() => {
        expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
      })
    );
    test(
      'positions should be ok',
      handleExpectedBlip(() => {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
      })
    );
  });

  describe('should use the latest state before notifying (when modifying data multiple times)', () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      tagCloud.setData(trimDataTest.data);

      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test(
      'completeness should be ok',
      handleExpectedBlip(() => {
        expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
      })
    );
    test(
      'positions should be ok',
      handleExpectedBlip(() => {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(trimDataTest.expected, textElements, tagCloud);
      })
    );
  });

  describe('should not get multiple render-events', () => {
    let counter;
    beforeEach(() => {
      counter = 0;

      return new Promise((resolve, reject) => {
        tagCloud = new TagCloud(domNode, colorScale);
        tagCloud.setData(baseTest.data);
        tagCloud.setOptions(baseTest.options);

        setTimeout(() => {
          //this should be overridden by later changes
          tagCloud.setData(sqrtScaleTest.data);
          tagCloud.setOptions(sqrtScaleTest.options);
        }, 100);

        setTimeout(() => {
          //latest change
          tagCloud.setData(logScaleTest.data);
          tagCloud.setOptions(logScaleTest.options);
        }, 300);

        tagCloud.on('renderComplete', function onRender() {
          if (counter > 0) {
            reject('Should not get multiple render events');
          }
          counter += 1;
          resolve(true);
        });
      });
    });

    afterEach(teardownDOM);

    test(
      'completeness should be ok',
      handleExpectedBlip(() => {
        expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
      })
    );
    test(
      'positions should be ok',
      handleExpectedBlip(() => {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
      })
    );
  });

  describe('should show correct data when state-updates are interleaved with resize event', () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(logScaleTest.data);
      tagCloud.setOptions(logScaleTest.options);

      await delay(1000); //let layout run

      SVGElementGetBBoxSpyInstance.mockRestore();
      SVGElementGetBBoxSpyInstance = setSVGElementGetBBox(600, 600);

      tagCloud.resize(); //triggers new layout
      setTimeout(() => {
        //change the options at the very end too
        tagCloud.setData(baseTest.data);
        tagCloud.setOptions(baseTest.options);
      }, 200);
      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test(
      'completeness should be ok',
      handleExpectedBlip(() => {
        expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
      })
    );
    test(
      'positions should be ok',
      handleExpectedBlip(() => {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(baseTest.expected, textElements, tagCloud);
      })
    );
  });

  describe(`should not put elements in view when container is too small`, () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test('completeness should not be ok', () => {
      expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.INCOMPLETE);
    });
    test('positions should not be ok', () => {
      const textElements = domNode.querySelectorAll('text');
      for (let i = 0; i < textElements; i++) {
        const bbox = textElements[i].getBoundingClientRect();
        verifyBbox(bbox, false, tagCloud);
      }
    });
  });

  describe(`tags should fit after making container bigger`, () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode((cb) => tagCloud.once('renderComplete', cb));

      //make bigger
      tagCloud._size = [600, 600];
      tagCloud.resize();
      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test(
      'completeness should be ok',
      handleExpectedBlip(() => {
        expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.COMPLETE);
      })
    );
  });

  describe(`tags should no longer fit after making container smaller`, () => {
    beforeEach(async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode((cb) => tagCloud.once('renderComplete', cb));

      //make smaller
      tagCloud._size = [];
      tagCloud.resize();
      await fromNode((cb) => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    test('completeness should not be ok', () => {
      expect(tagCloud.getStatus()).toEqual(TagCloud.STATUS.INCOMPLETE);
    });
  });

  describe('tagcloudscreenshot', () => {
    afterEach(teardownDOM);

    test('should render simple image', async () => {
      tagCloud = new TagCloud(domNode, colorScale);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);

      await fromNode((cb) => tagCloud.once('renderComplete', cb));

      expect(domNode.innerHTML).toMatchSnapshot();
    });
  });

  function verifyTagProperties(expectedValues, actualElements, tagCloud) {
    expect(actualElements.length).toEqual(expectedValues.length);
    expectedValues.forEach((test, index) => {
      try {
        expect(actualElements[index].style.fontSize).toEqual(test.fontSize);
      } catch (e) {
        throw new Error('fontsize is not correct: ' + e.message);
      }
      try {
        expect(actualElements[index].innerHTML).toEqual(test.text);
      } catch (e) {
        throw new Error('fontsize is not correct: ' + e.message);
      }
      isInsideContainer(actualElements[index], tagCloud);
    });
  }

  function isInsideContainer(actualElement, tagCloud) {
    const bbox = actualElement.getBoundingClientRect();
    verifyBbox(bbox, true, tagCloud);
  }

  function verifyBbox(bbox, shouldBeInside, tagCloud) {
    const message = ` | bbox-of-tag: ${JSON.stringify([
      bbox.left,
      bbox.top,
      bbox.right,
      bbox.bottom,
    ])} vs
     bbox-of-container: ${domNode.offsetWidth},${domNode.offsetHeight}
     debugInfo: ${JSON.stringify(tagCloud.getDebugInfo())}`;

    try {
      expect(bbox.top >= 0 && bbox.top <= domNode.offsetHeight).toBe(shouldBeInside);
    } catch (e) {
      throw new Error(
        'top boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message
      );
    }
    try {
      expect(bbox.bottom >= 0 && bbox.bottom <= domNode.offsetHeight).toBe(shouldBeInside);
    } catch (e) {
      throw new Error(
        'bottom boundary of tag should have been ' +
          (shouldBeInside ? 'inside' : 'outside') +
          message
      );
    }
    try {
      expect(bbox.left >= 0 && bbox.left <= domNode.offsetWidth).toBe(shouldBeInside);
    } catch (e) {
      throw new Error(
        'left boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message
      );
    }
    try {
      expect(bbox.right >= 0 && bbox.right <= domNode.offsetWidth).toBe(shouldBeInside);
    } catch (e) {
      throw new Error(
        'right boundary of tag should have been ' +
          (shouldBeInside ? 'inside' : 'outside') +
          message
      );
    }
  }

  /**
   * In CI, this entire suite "blips" about 1/5 times.
   * This blip causes the majority of these tests fail for the exact same reason: One tag is centered inside the container,
   * while the others are moved out.
   * This has not been reproduced locally yet.
   * It may be an issue with the 3rd party d3-cloud that snags.
   *
   * The test suite should continue to catch reliably catch regressions of other sorts: unexpected and other uncaught errors,
   * scaling issues, ordering issues
   *
   */
  function shouldAssert() {
    const debugInfo = tagCloud.getDebugInfo();
    const count = debugInfo.positions.length;
    const largest = debugInfo.positions.pop(); //test suite puts largest tag at the end.

    const centered = largest[1] === 0 && largest[2] === 0;
    const halfWidth = debugInfo.size.width / 2;
    const halfHeight = debugInfo.size.height / 2;
    const inside = debugInfo.positions.filter((position) => {
      const x = position.x + halfWidth;
      const y = position.y + halfHeight;
      return 0 <= x && x <= debugInfo.size.width && 0 <= y && y <= debugInfo.size.height;
    });

    return centered && inside.length === count - 1;
  }

  function handleExpectedBlip(assertion) {
    return () => {
      if (!shouldAssert()) {
        return;
      }
      assertion();
    };
  }
});
