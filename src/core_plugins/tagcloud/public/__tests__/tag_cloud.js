import expect from 'expect.js';
import _ from 'lodash';
import TagCloud from 'plugins/tagcloud/tag_cloud';
import d3 from 'd3';
import { fromNode, delay } from 'bluebird';

describe('tag cloud tests', function () {

  const minValue = 1;
  const maxValue = 9;
  const midValue = (minValue + maxValue) / 2;
  const baseTest = {
    data: [
      { text: 'foo', value: minValue },
      { text: 'bar', value: midValue },
      { text: 'foobar', value: maxValue },
    ],
    options: {
      orientation: 'single',
      scale: 'linear',
      minFontSize: 10,
      maxFontSize: 36
    },
    expected: [
      {
        text: 'foo',
        fontSize: '10px'
      },
      {
        text: 'bar',
        fontSize: '23px'
      },
      {
        text: 'foobar',
        fontSize: '36px'
      }
    ]
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

  function setupDOM() {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = '512px';
    domNode.style.height = '512px';
    domNode.style.position = 'fixed';
    domNode.style['pointer-events'] = 'none';
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
    trimDataTest
  ].forEach(function (test) {

    describe(`should position elements correctly for options: ${JSON.stringify(test.options)}`, function () {

      beforeEach(async function () {
        setupDOM();
        tagCloud = new TagCloud(domNode);
        tagCloud.setData(test.data);
        tagCloud.setOptions(test.options);
        await fromNode(cb => tagCloud.once('renderComplete', cb));
      });

      afterEach(teardownDOM);

      it('completeness should be ok', handleExpectedBlip(function () {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
      }));

      it('positions should be ok', handleExpectedBlip(function () {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(test.expected, textElements, tagCloud);
      }));

    });

  });


  [
    5,
    100,
    200,
    300,
    500
  ].forEach(function (timeout) {
    describe(`should only send single renderComplete event at the very end, using ${timeout}ms timeout`, function () {

      beforeEach(async function () {
        setupDOM();

        //TagCloud takes at least 600ms to complete (due to d3 animation)
        //renderComplete should only notify at the last one
        tagCloud = new TagCloud(domNode);
        tagCloud.setData(baseTest.data);
        tagCloud.setOptions(baseTest.options);

        //this timeout modifies the settings before the cloud is rendered.
        //the cloud needs to use the correct options
        setTimeout(() => tagCloud.setOptions(logScaleTest.options), timeout);
        await fromNode(cb => tagCloud.once('renderComplete', cb));

      });

      afterEach(teardownDOM);

      it('completeness should be ok', handleExpectedBlip(function () {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
      }));

      it('positions should be ok', handleExpectedBlip(function () {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
      }));

    });
  });

  describe('should use the latest state before notifying (when modifying options multiple times)', function () {

    beforeEach(async function () {
      setupDOM();
      tagCloud = new TagCloud(domNode);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      tagCloud.setOptions(logScaleTest.options);
      await fromNode(cb => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    it('completeness should be ok', handleExpectedBlip(function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
    }));
    it('positions should be ok', handleExpectedBlip(function () {
      const textElements = domNode.querySelectorAll('text');
      verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
    }));

  });

  describe('should use the latest state before notifying (when modifying data multiple times)', function () {

    beforeEach(async function () {
      setupDOM();
      tagCloud = new TagCloud(domNode);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      tagCloud.setData(trimDataTest.data);
      await fromNode(cb => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    it('completeness should be ok', handleExpectedBlip(function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
    }));
    it('positions should be ok', handleExpectedBlip(function () {
      const textElements = domNode.querySelectorAll('text');
      verifyTagProperties(trimDataTest.expected, textElements, tagCloud);
    }));

  });

  describe('should not get multiple render-events', function () {

    let counter;
    beforeEach(function () {
      counter = 0;
      setupDOM();
      return new Promise((resolve, reject)=> {
        tagCloud = new TagCloud(domNode);
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

    it('completeness should be ok', handleExpectedBlip(function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
    }));
    it('positions should be ok', handleExpectedBlip(function () {
      const textElements = domNode.querySelectorAll('text');
      verifyTagProperties(logScaleTest.expected, textElements, tagCloud);
    }));

  });


  describe('should show correct data when state-updates are interleaved with resize event', function () {

    beforeEach(async function () {
      setupDOM();
      tagCloud = new TagCloud(domNode);
      tagCloud.setData(logScaleTest.data);
      tagCloud.setOptions(logScaleTest.options);

      await delay(1000);//let layout run
      domNode.style.width = '600px';
      domNode.style.height = '600px';
      tagCloud.resize();//triggers new layout
      setTimeout(() => {//change the options at the very end too
        tagCloud.setData(baseTest.data);
        tagCloud.setOptions(baseTest.options);
      }, 200);
      await fromNode(cb => tagCloud.once('renderComplete', cb));

    });

    afterEach(teardownDOM);

    it('completeness should be ok', handleExpectedBlip(function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
    }));
    it('positions should be ok', handleExpectedBlip(function () {
      const textElements = domNode.querySelectorAll('text');
      verifyTagProperties(baseTest.expected, textElements, tagCloud);
    }));


  });


  describe(`should not put elements in view when container is too small`, function () {

    beforeEach(async function () {
      setupDOM();
      domNode.style.width = '1px';
      domNode.style.height = '1px';
      tagCloud = new TagCloud(domNode);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode(cb => tagCloud.once('renderComplete', cb));
    });

    afterEach(teardownDOM);

    it('completeness should not be ok', function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
    });
    it('positions should not be ok', function () {
      const textElements = domNode.querySelectorAll('text');
      for (let i = 0; i < textElements; i++) {
        const bbox = textElements[i].getBoundingClientRect();
        verifyBbox(bbox, false, tagCloud);
      }
    });
  });


  describe(`tags should fit after making container bigger`, function () {

    beforeEach(async function () {
      setupDOM();
      domNode.style.width = '1px';
      domNode.style.height = '1px';

      tagCloud = new TagCloud(domNode);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode(cb => tagCloud.once('renderComplete', cb));

      //make bigger
      domNode.style.width = '512px';
      domNode.style.height = '512px';
      tagCloud.resize();
      await fromNode(cb => tagCloud.once('renderComplete', cb));

    });

    afterEach(teardownDOM);

    it('completeness should be ok', handleExpectedBlip(function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
    }));

  });

  describe(`tags should no longer fit after making container smaller`, function () {

    beforeEach(async function () {
      setupDOM();
      tagCloud = new TagCloud(domNode);
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      await fromNode(cb => tagCloud.once('renderComplete', cb));

      //make smaller
      domNode.style.width = '1px';
      domNode.style.height = '1px';
      tagCloud.resize();
      await fromNode(cb => tagCloud.once('renderComplete', cb));

    });

    afterEach(teardownDOM);

    it('completeness should not be ok', function () {
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
    });

  });

  function verifyTagProperties(expectedValues, actualElements, tagCloud) {
    expect(actualElements.length).to.equal(expectedValues.length);
    expectedValues.forEach((test, index) => {
      try {
        expect(actualElements[index].style.fontSize).to.equal(test.fontSize);
      } catch (e) {
        throw new Error('fontsize is not correct: ' + e.message);
      }
      try {
        expect(actualElements[index].innerHTML).to.equal(test.text);
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
    const message = ` | bbox-of-tag: ${JSON.stringify([bbox.left, bbox.top, bbox.right, bbox.bottom])} vs
     bbox-of-container: ${domNode.offsetWidth},${domNode.offsetHeight}
     debugInfo: ${JSON.stringify(tagCloud.getDebugInfo())}`;

    try {
      expect(bbox.top >= 0 && bbox.top <= domNode.offsetHeight).to.be(shouldBeInside);
    } catch (e) {
      throw new Error('top boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message);
    }
    try {
      expect(bbox.bottom >= 0 && bbox.bottom <= domNode.offsetHeight).to.be(shouldBeInside);
    } catch (e) {
      throw new Error('bottom boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message);
    }
    try {
      expect(bbox.left >= 0 && bbox.left <= domNode.offsetWidth).to.be(shouldBeInside);
    } catch (e) {
      throw new Error('left boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message);
    }
    try {
      expect(bbox.right >= 0 && bbox.right <= domNode.offsetWidth).to.be(shouldBeInside);
    } catch (e) {
      throw new Error('right boundary of tag should have been ' + (shouldBeInside ? 'inside' : 'outside') + message);
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
    const largest = debugInfo.positions.pop();//test suite puts largest tag at the end.


    const centered = (largest[1] === 0 && largest[2] === 0);
    const halfWidth = debugInfo.size.width / 2;
    const halfHeight = debugInfo.size.height / 2;
    const inside = debugInfo.positions.filter(position => {
      const x = position.x + halfWidth;
      const y = position.y + halfHeight;
      return 0 <= x && x <= debugInfo.size.width && 0 <= y && y <= debugInfo.size.height;
    });

    return centered && inside.length === count - 1;

  }

  function handleExpectedBlip(assertion) {
    return function () {
      if (!shouldAssert()) {
        return;
      }
      assertion();
    };
  }

});
