import expect from 'expect.js';
import _ from 'lodash';
import TagCloud from 'plugins/tagcloud/tag_cloud';
import d3 from 'd3';

describe('tag cloud', function () {

  let domNode;

  beforeEach(function () {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = '512px';
    domNode.style.height = '512px';
    domNode.style.position = 'fixed';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  });

  afterEach(function () {
    document.body.removeChild(domNode);
  });


  const minValue = 1;
  const maxValue = 9;
  const midValue = (minValue + maxValue) / 2;
  const baseTest = {
    data: [
      {text: 'foo', value: minValue},
      {text: 'bar', value: midValue},
      {text: 'foobar', value: maxValue},
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

  [
    singleLayoutTest,
    rightAngleLayoutTest,
    multiLayoutTest,
    logScaleTest,
    sqrtScaleTest,
    biggerFontTest,
    trimDataTest
  ].forEach((test, index) => {

    it(`should position elements correctly: ${index}`, done => {
      const tagCloud = new TagCloud(domNode);
      tagCloud.setData(test.data);
      tagCloud.setOptions(test.options);
      tagCloud.on('renderComplete', function onRender() {
        try {
          tagCloud.removeListener('renderComplete', onRender);
          const textElements = domNode.querySelectorAll('text');
          verifyTagProperties(test.expected, textElements);
          expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
          done();
        } catch (e) {
          done(e);
        }

      });
    });
  });


  it('should use the latest state before notifying (modifying options)', function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);
    tagCloud.setOptions(logScaleTest.options);
    tagCloud.on('renderComplete', function onRender() {
      try {
        tagCloud.removeListener('renderComplete', onRender);
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(logScaleTest.expected, textElements);
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
        done();
      } catch (e) {
        done(e);
      }

    });

  });


  it('should use the latest state before notifying (modifying data)', function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);
    tagCloud.setData(trimDataTest.data);

    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      const textElements = domNode.querySelectorAll('text');
      try {
        verifyTagProperties(trimDataTest.expected, textElements);
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
        done();
      } catch (e) {
        done(e);
      }
    });

  });

  [
    5,
    100,
    200,
    300,
    500
  ].forEach(function (timeout, index) {
    it(`should only send single renderComplete event: ${index}`, function (done) {
      //TagCloud takes at least 600ms to complete (due to d3 animation)
      //renderComplete should only notify at the last one
      const tagCloud = new TagCloud(domNode);
      tagCloud.on('renderComplete', function onRender() {
        try {
          tagCloud.removeListener('renderComplete', onRender);
          const textElements = domNode.querySelectorAll('text');
          verifyTagProperties(logScaleTest.expected, textElements);
          expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
          done();
        } catch (e) {
          done(e);
        }
      });
      tagCloud.setData(baseTest.data);
      tagCloud.setOptions(baseTest.options);
      setTimeout(() => {
        tagCloud.setOptions(logScaleTest.options);
      }, timeout);
    });
  });

  it('should not get multiple render-events', function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);

    setTimeout(() => {
      //this should be overridden by later changes
      tagCloud.setData(sqrtScaleTest.data);
      tagCloud.setOptions(sqrtScaleTest.options);
    }, 100);

    setTimeout(() => {
      tagCloud.setData(logScaleTest.data);
      tagCloud.setOptions(logScaleTest.options);
    }, 300);

    let counter = 0;

    function onRender() {
      if (counter > 0) {
        throw new Error('Should not get multiple render events');
      }
      counter += 1;
      try {
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(logScaleTest.expected, textElements);
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
      } catch (e) {
        done(e);
      }

    }

    tagCloud.on('renderComplete', onRender);
    setTimeout(function () {
      tagCloud.removeListener('renderComplete', onRender);
      done();
    }, 1500);

  });

  it('should show correct data when state-updates are interleaved with resize event', function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(logScaleTest.data);
    tagCloud.setOptions(logScaleTest.options);

    setTimeout(() => {
      try {
        domNode.style.width = '600px';
        domNode.style.height = '600px';

        tagCloud.resize();

        setTimeout(() => {
          try {
            tagCloud.setData(baseTest.data);
            tagCloud.setOptions(baseTest.options);
          } catch (e) {
            done(e);
          }
        }, 200);

        tagCloud.on('renderComplete', function onRender() {
          try {
            tagCloud.removeListener('renderComplete', onRender);
            const textElements = domNode.querySelectorAll('text');
            verifyTagProperties(baseTest.expected, textElements);
            expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
            done();
          } catch (e) {
            done(e);
          }
        });
      } catch (e) {
        done(e);
      }
    }, 1000);


  });


  it(`should not put elements in view when container is too small`, function (done) {

    domNode.style.width = '1px';
    domNode.style.height = '1px';

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      try {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
        const textElements = domNode.querySelectorAll('text');
        for (let i = 0; i < textElements; i++) {
          const bbox = textElements[i].getBoundingClientRect();
          verifyBbox(bbox, false);
        }
        done();
      } catch (e) {
        done(e);
      }
    });
  });


  it(`tags should fit after making container bigger`, function (done) {

    domNode.style.width = '1px';
    domNode.style.height = '1px';

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      try {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
      } catch (e) {
        done(e);
      }

      domNode.style.width = '512px';
      domNode.style.height = '512px';
      tagCloud.on('renderComplete', _ => {
        try {
          expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
          done();
        } catch (e) {
          done(e);
        }
      });
      tagCloud.resize();

    });
  });

  it(`tags should no longer fit after making container smaller`, function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTest.data);
    tagCloud.setOptions(baseTest.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      try {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
      } catch (e) {
        done(e);
      }

      domNode.style.width = '1px';
      domNode.style.height = '1px';
      tagCloud.on('renderComplete', _ => {
        try {
          expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
          done();
        } catch (e) {
          done(e);
        }
      });
      tagCloud.resize();

    });

  });

  function verifyTagProperties(expectedValues, actualElements) {
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
      isInsideContainer(actualElements[index]);
    });
  }

  function isInsideContainer(actualElement) {
    const bbox = actualElement.getBoundingClientRect();
    verifyBbox(bbox, true);
  }

  function verifyBbox(bbox, shouldBeInside) {
    const message = ` | bbox-of-tag: ${JSON.stringify([bbox.left, bbox.top, bbox.right, bbox.bottom])} vs
     bbox-of-container: ${domNode.offsetWidth},${domNode.offsetHeight}`;
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


});
