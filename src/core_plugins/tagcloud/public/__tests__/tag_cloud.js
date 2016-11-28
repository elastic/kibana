import expect from 'expect.js';
import _ from 'lodash';
import TagCloud from 'plugins/tagcloud/tag_cloud';

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


  const baseTestConfig = {
    data: [
      {text: 'foo', size: 1},
      {text: 'bar', size: 5},
      {text: 'foobar', size: 9},
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

  const singleLayout = _.cloneDeep(baseTestConfig);
  const rightAngleLayout = _.cloneDeep(baseTestConfig);
  rightAngleLayout.options.orientation = 'right angled';
  const multiLayout = _.cloneDeep(baseTestConfig);
  multiLayout.options.orientation = 'multiple';
  const logScale = _.cloneDeep(baseTestConfig);
  logScale.options.scale = 'log';
  logScale.expected[1].fontSize = '31px';
  const sqrtScale = _.cloneDeep(baseTestConfig);
  sqrtScale.options.scale = 'square root';
  sqrtScale.expected[1].fontSize = '27px';
  const biggerFont = _.cloneDeep(baseTestConfig);
  biggerFont.options.minFontSize = 36;
  biggerFont.options.maxFontSize = 72;
  biggerFont.expected[0].fontSize = '36px';
  biggerFont.expected[1].fontSize = '54px';
  biggerFont.expected[2].fontSize = '72px';

  [
    singleLayout,
    rightAngleLayout,
    multiLayout,
    logScale,
    sqrtScale,
    biggerFont
  ].forEach((test, index) => {

    it(`should position elements correctly: ${index}`, done => {
      const tagCloud = new TagCloud(domNode);
      tagCloud.setData(test.data);
      tagCloud.setOptions(test.options);
      tagCloud.on('renderComplete', function onRender() {
        tagCloud.removeListener('renderComplete', onRender);
        const textElements = domNode.querySelectorAll('text');
        verifyTagProperties(test.expected, textElements);
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
        done();
      });
    });
  });

  it(`should not put elements in view when container to small`, function (done) {

    domNode.style.width = '1px';
    domNode.style.height = '1px';

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTestConfig.data);
    tagCloud.setOptions(baseTestConfig.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
      const textElements = domNode.querySelectorAll('text');
      for (let i = 0; i < textElements; i++) {
        const bbox = textElements[i].getBoundingClientRect();
        verifyBbox(bbox, false);
      }
      done();
    });
  });


  it(`tags should fit after making container bigger`, function (done) {

    domNode.style.width = '1px';
    domNode.style.height = '1px';

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTestConfig.data);
    tagCloud.setOptions(baseTestConfig.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);

      domNode.style.width = '512px';
      domNode.style.height = '512px';
      tagCloud.on('renderComplete', _ => {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);
        done();
      });
      tagCloud.resize();

    });
  });

  it(`tags should no longer fit after making container smaller`, function (done) {

    const tagCloud = new TagCloud(domNode);
    tagCloud.setData(baseTestConfig.data);
    tagCloud.setOptions(baseTestConfig.options);
    tagCloud.on('renderComplete', function onRender() {
      tagCloud.removeListener('renderComplete', onRender);
      expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.COMPLETE);

      domNode.style.width = '1px';
      domNode.style.height = '1px';
      tagCloud.on('renderComplete', _ => {
        expect(tagCloud.getStatus()).to.equal(TagCloud.STATUS.INCOMPLETE);
        done();
      });
      tagCloud.resize();

    });

  });

  function verifyTagProperties(expectedValues, actualElements) {
    expect(actualElements.length).to.equal(expectedValues.length);
    expectedValues.forEach((test, index) => {
      expect(actualElements[index].style.fontSize).to.equal(test.fontSize);
      expect(actualElements[index].innerHTML).to.equal(test.text);
      isInsideContainer(actualElements[index]);
    });
  }

  function isInsideContainer(actualElement) {
    const bbox = actualElement.getBoundingClientRect();
    verifyBbox(bbox, true);
  }

  function verifyBbox(bbox, shouldBeInside) {
    expect(bbox.top >= 0 && bbox.top <= domNode.offsetHeight).to.be(shouldBeInside);
    expect(bbox.bottom >= 0 && bbox.bottom <= domNode.offsetHeight).to.be(shouldBeInside);
    expect(bbox.left >= 0 && bbox.left <= domNode.offsetWidth).to.be(shouldBeInside);
    expect(bbox.right >= 0 && bbox.right <= domNode.offsetWidth).to.be(shouldBeInside);
  }


});
