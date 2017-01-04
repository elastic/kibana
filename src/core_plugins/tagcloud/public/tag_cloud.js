import d3 from 'd3';
import d3TagCloud from 'd3-cloud';
import vislibComponentsSeedColorsProvider from 'ui/vis/components/color/seed_colors';
import { EventEmitter } from 'events';


const ORIENTATIONS = {
  'single': () => 0,
  'right angled': (tag) => {
    return hashCode(tag.text) % 2 * 90;
  },
  'multiple': (tag) => {
    const hashcode = Math.abs(hashCode(tag.text));
    return ((hashcode % 12) * 15) - 90;//fan out 12 * 15 degrees over top-right and bottom-right quadrant (=-90 deg offset)
  }
};
const D3_SCALING_FUNCTIONS = {
  'linear': () => d3.scale.linear(),
  'log': () => d3.scale.log(),
  'square root': () => d3.scale.sqrt()
};


class TagCloud extends EventEmitter {

  constructor(domNode) {

    super();

    //DOM
    this._element = domNode;
    this._d3SvgContainer = d3.select(this._element).append('svg');
    this._svgGroup = this._d3SvgContainer.append('g');
    this._size = [1, 1];
    this.resize();

    //SETTING (non-configurable)
    this._fontFamily = 'Impact';
    this._fontStyle = 'normal';
    this._fontWeight = 'normal';
    this._spiral = 'archimedean';//layout shape
    this._timeInterval = 1000;//time allowed for layout algorithm
    this._padding = 5;

    //OPTIONS
    this._orientation = 'single';
    this._minFontSize = 10;
    this._maxFontSize = 36;
    this._textScale = 'linear';
    this._optionsAsString = null;

    //DATA
    this._words = null;

    //UTIL
    this._handle = null;
    this._queue = [];
    this._allInViewBox = false;
    this._inFlight = false;

  }

  setOptions(options) {
    if (JSON.stringify(options) === this._optionsAsString) {
      return;
    }
    this._optionsAsString = JSON.stringify(options);
    this._orientation = options.orientation;
    this._minFontSize = Math.min(options.minFontSize, options.maxFontSize);
    this._maxFontSize = Math.max(options.minFontSize, options.maxFontSize);
    this._textScale = options.scale;
    this._invalidate(false);
  }


  resize() {
    const newWidth = this._element.offsetWidth;
    const newHeight = this._element.offsetHeight;
    if (newWidth < 1 || newHeight < 1) {
      return;
    }
    if (newWidth === this._size[0] && newHeight === this._size[1]) {
      return;
    }

    const wasInside = this._size[0] >= this._cloudWidth && this._size[1] >= this._cloudHeight;
    const willBeInside = this._cloudWidth <= newWidth && this._cloudHeight <= newHeight;
    this._size[0] = newWidth;
    this._size[1] = newHeight;
    if (wasInside && willBeInside && this._allInViewBox) {
      this._invalidate(true);
    } else {
      this._invalidate(false);
    }

  }

  setData(data) {
    this._words = data.map(toWordTag);
    this._invalidate(false);
  }

  destroy() {
    clearTimeout(this._handle);
    this._element.innerHTML = '';
  }

  getStatus() {
    return this._allInViewBox ? TagCloud.STATUS.COMPLETE : TagCloud.STATUS.INCOMPLETE;
  }

  _updateContainerSize() {
    this._d3SvgContainer.attr('width', this._size[0]);
    this._d3SvgContainer.attr('height', this._size[1]);
    this._svgGroup.attr('width', this._size[0]);
    this._svgGroup.attr('height', this._size[1]);
  }

  _processQueue() {

    if (!this._queue.length) {
      this.emit('renderComplete');
      return;
    }

    if (this._inFlight) {
      return;
    }

    const job = this._queue.pop();
    this._inFlight = true;

    if (job.words.length) {
      this._onLayoutEnd(job);
    } else {
      this._emptyCloud(job);
    }

  }

  _emptyCloud(job) {
    this._svgGroup.selectAll('text').remove();
    this._cloudWidth = 0;
    this._cloudHeight = 0;
    this._allInViewBox = true;
    this._inFlight = false;
    this._currentJob = job;
    this._processQueue();
  }

  _onLayoutEnd(job) {

    if (this._handle !== null) {//a new configuration is coming, no need to update
      this._processQueue();
      return;
    }

    this._currentJob = null;
    const affineTransform = positionWord.bind(null, this._element.offsetWidth / 2, this._element.offsetHeight / 2);
    const svgTextNodes = this._svgGroup.selectAll('text');
    const stage = svgTextNodes.data(job.words, getText);

    const enterSelection = stage.enter();
    const enteringTags = enterSelection.append('text');
    enteringTags.style('font-size', getSizeInPixels);
    enteringTags.style('font-style', this._fontStyle);
    enteringTags.style('font-weight', () => this._fontWeight);
    enteringTags.style('font-family', () => this._fontFamily);
    enteringTags.style('fill', getFill);
    enteringTags.attr('text-anchor', () => 'middle');
    enteringTags.attr('transform', affineTransform);
    enteringTags.text(getText);

    const self = this;
    enteringTags.on({
      click: function (event) {
        self.emit('select', event.text);
      },
      mouseover: function (d) {
        d3.select(this).style('cursor', 'pointer');
      },
      mouseout: function (d) {
        d3.select(this).style('cursor', 'default');
      }
    });

    const movingTags = stage.transition();
    movingTags.duration(600);
    movingTags.style('font-size', getSizeInPixels);
    movingTags.style('font-style', this._fontStyle);
    movingTags.style('font-weight', () => this._fontWeight);
    movingTags.style('font-family', () => this._fontFamily);
    movingTags.attr('transform', affineTransform);

    const exitingTags = stage.exit();
    const exitTransition = exitingTags.transition();
    exitTransition.duration(200);
    exitingTags.style('fill-opacity', 1e-6);
    exitingTags.attr('font-size', 1);
    exitingTags.remove();

    let exits = 0;
    let moves = 0;
    const resolveWhenDone = () => {
      if (exits === 0 && moves === 0) {
        const cloudBBox = this._svgGroup[0][0].getBBox();
        this._cloudWidth = cloudBBox.width;
        this._cloudHeight = cloudBBox.height;
        this._allInViewBox = cloudBBox.x >= 0 && cloudBBox.y >= 0 &&
          cloudBBox.x + cloudBBox.width <= this._element.offsetWidth &&
          cloudBBox.y + cloudBBox.height <= this._element.offsetHeight;

        this._inFlight = false;
        this._currentJob = job;
        this._processQueue();
      }
    };
    exitTransition.each(_ => exits++);
    exitTransition.each('end', () => {
      exits--;
      resolveWhenDone();
    });
    movingTags.each(_ => moves++);
    movingTags.each('end', () => {
      moves--;
      resolveWhenDone();
    });

  }

  _makeTextSizeMapper() {
    const mapSizeToFontSize = D3_SCALING_FUNCTIONS[this._textScale]();
    const range = this._words.length === 1 ? [this._maxFontSize, this._maxFontSize] : [this._minFontSize, this._maxFontSize];
    mapSizeToFontSize.range(range);
    if (this._words) {
      mapSizeToFontSize.domain(d3.extent(this._words, getValue));
    }
    return mapSizeToFontSize;
  }

  _makeJob() {
    return {
      words: this._words.map(toWordTag)
    };
  }

  _invalidate(keepLayout) {

    if (!this._words) {
      return;
    }

    clearTimeout(this._handle);
    this._handle = setTimeout(() => {
      this._handle = null;
      this._updateContainerSize();
      if (keepLayout && this._currentJob && this._queue.length === 0) {
        this._scheduleLayout({
          words: this._currentJob.words.map(tag => {
            return {
              x: tag.x,
              y: tag.y,
              rotate: tag.rotate,
              size: tag.size,
              text: tag.text
            };
          })
        });
      } else {
        this._updateLayout();
      }
    }, 0);//unhook from callstack. this avoids kicking off multiple layouts if multiple changes come in succession
  }

  _scheduleLayout(job) {
    this._queue.unshift(job);
    this._processQueue();
  }

  _updateLayout() {

    const job = this._makeJob();
    const mapSizeToFontSize = this._makeTextSizeMapper();

    const tagCloudLayoutGenerator = d3TagCloud();
    tagCloudLayoutGenerator.size(this._size);
    tagCloudLayoutGenerator.padding(this._padding);
    tagCloudLayoutGenerator.rotate(ORIENTATIONS[this._orientation]);
    tagCloudLayoutGenerator.font(this._fontFamily);
    tagCloudLayoutGenerator.fontStyle(this._fontStyle);
    tagCloudLayoutGenerator.fontWeight(this._fontWeight);
    tagCloudLayoutGenerator.fontSize(tag => {
      return mapSizeToFontSize(tag.value);
    });
    tagCloudLayoutGenerator.random(seed);
    tagCloudLayoutGenerator.spiral(this._spiral);
    tagCloudLayoutGenerator.words(job.words);
    tagCloudLayoutGenerator.text(getText);
    tagCloudLayoutGenerator.timeInterval(this._timeInterval);
    tagCloudLayoutGenerator.on('end', () => this._scheduleLayout(job));
    tagCloudLayoutGenerator.start();
  }

  /**
   * Returns debug info. For debugging only.
   * @return {*}
   */
  getDebugInfo() {
    const debug = {};
    debug.positions = this._currentJob ? this._currentJob.words.map(tag => {
      return {
        text: tag.text,
        x: tag.x,
        y: tag.y,
        rotate: tag.rotate
      };
    }) : [];
    debug.size = {
      width: this._size[0],
      height: this._size[1]
    };
    return debug;
  }

}

TagCloud.STATUS = { COMPLETE: 0, INCOMPLETE: 1 };

function seed() {
  return 0.5;//constant seed (not random) to ensure constant layouts for identical data
}

function toWordTag(word) {
  return { value: word.value, text: word.text };
}


function getText(word) {
  return word.text;
}

function positionWord(xTranslate, yTranslate, word) {

  if (isNaN(word.x) || isNaN(word.y) || isNaN(word.rotate)) {
    //move off-screen
    return `translate(${xTranslate * 3}, ${yTranslate * 3})rotate(0)`;
  }

  return `translate(${word.x + xTranslate}, ${word.y + yTranslate})rotate(${word.rotate})`;
}

function getValue(tag) {
  return tag.value;
}

function getSizeInPixels(tag) {
  return `${tag.size}px`;
}

const colorScale = d3.scale.ordinal().range(vislibComponentsSeedColorsProvider());
function getFill(tag) {
  return colorScale(tag.text);
}

/**
 * Hash a string to a number. Ensures there is no random element in positioning strings
 * Retrieved from http://stackoverflow.com/questions/26057572/string-to-unique-hash-in-javascript-jquery
 * @param string
 */
function hashCode(string) {
  string = JSON.stringify(string);
  let hash = 0;
  if (string.length === 0) {
    return hash;
  }
  for (let i = 0; i < string.length; i++) {
    const char = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export default TagCloud;
