import _ from 'lodash';
import moment from 'moment';
import dateMath from 'ui/utils/dateMath';

export default function VisTimefilterHandlerFactory(timefilter, config) {

  /**
   * The VisTimefilterHandler encapsulates all functionality that is needed to
   * support time sets in visualization and fetch stage.
   *
   * An instance of the Handler is assigned to a visualization and is
   * referenced by all SearchSources that are derived from this visualization.
   *
   * @indexPattern the index pattern used by the visualization
   * @params the params object of the visualization
   *
   */
  function VisTimefilterHandler(indexPattern) {
    this.indexPattern = indexPattern;
    this.from = null;
    this.to = null;
    this.interval = null;
    this.dateField = indexPattern.timeFieldName;
    this.watchCounter = 0;
  }

  /**
   * Sets the local time of this handler.
   */
  VisTimefilterHandler.prototype._setTime = function (from, to, interval) {
    if (this.from !== from || this.to !== to || this.interval !== interval) {
      this.from = this._toTicks(from);
      this.to = this._toTicks(to);
      this.interval = interval;
    }
  };

  /**
   * Clears the local time of this handler.
   */
  VisTimefilterHandler.prototype._clearTime = function () {
    if (this.hasTime()) {
      this.from = null;
      this.to = null;
      this.interval = null;
    }
  };

  /**
   * @return the time of this handler in form of a bounds array (min, max).
   *         The "time of the handler" is either a local time or the global
   *         timefilter time.
   */
  VisTimefilterHandler.prototype.getBounds = function () {
    if (this.hasTime()) {
      return {
        min : moment(this.from),
        max : moment(this.to)
      };
    } else {
      return timefilter.getBounds();
    }
  };

  /**
   * @return the time of this handler in form of a bounds array (min, max).
   *         The "time of the handler" is either a local time or the global
   *         timefilter time. If no local time is set and the time filter is
   *         not enabled, this method returns undefined
   */
  VisTimefilterHandler.prototype.getActiveBounds = function () {
    if (this.hasTime()) {
      return {
        min : moment(this.from),
        max : moment(this.to)
      };
    } else {
      return timefilter.getActiveBounds();
    }
  };

  /**
   * @return the time of this handler in form of a range.
   *
   * {range: {[TIMEFIELD_NAME]: {gte: [TICKS_FROM], lte: [TICKS_TO]}}
   *
   * The time of the handler is either a local time or the global timefilter
   * time.
   */
  VisTimefilterHandler.prototype.getTimeRange = function () {
    if (this.hasTime()) {
      var obj = {
        range : {}
      };
      obj.range[this.dateField] = {
        'gte' : this.from,
        'lte' : this.to
      };
      return obj;
    } else {
      return timefilter.get(this.indexPattern);
    }

  };

  /**
   * @return true, if a local time is set.
   */
  VisTimefilterHandler.prototype.hasTime = function () {
    return this.from != null;
  };

  /**
   * @return from formatted or empty string if from is not set
   */
  VisTimefilterHandler.prototype.getFromFormatted = function () {
    return this.from != null ? moment(this.from).format(config.get('dateFormat')) : '';
  };

  /**
   * @return to formatted or empty string if to is not set
   */
  VisTimefilterHandler.prototype.getToFormatted = function () {
    return this.to != null ? moment(this.to).format(config.get('dateFormat')) : '';
  };

  /**
   * Adds a new blank timeset to the list of local timesets available.
   */
  VisTimefilterHandler.prototype.addNewTimeset = function (visParams) {
    if (!visParams.timeSets) {
      visParams.timeSets = {
        available : []
      };
    } else if (!visParams.timeSets.available) {
      visParams.timeSets.available = [];
    }

    visParams.timeSets.available.push({
      showInitially : false,
      from : null,
      to : null,
      label : '',
      interval : ''
    });
  };

  /**
   * Init with visualization params.
   *
   * Searches for a time set with "showInitially == true".
   * If one is found, the vis time is set to the values from this set.
   */
  VisTimefilterHandler.prototype.initWithParams = function (visParams) {
    var self = this;
    var sets = visParams.timeSets;

    if (sets && sets.available) {
      sets.available.some(function (item) {
        if (item.showInitially) {
          self._setTime(item.from, item.to, item.interval);
          sets.selected = item;
          return true;
        }
      });

    }

  };

  /**
   * @return true, if buttons to select localtime shall be shown
   */
  VisTimefilterHandler.prototype.isShowVisTimefilterSelection = function (visParams) {
    var self = this;
    var sets = visParams.timeSets;

    return sets && sets.showUi && sets.available && sets.available.length > 0;

  };


  VisTimefilterHandler.prototype.getAvailable = function (visParams) {
    var sets = visParams.timeSets;

    if (sets && sets.available) {
      return sets.available;
    } else {
      return [];
    }
  };

  VisTimefilterHandler.prototype.isSelected = function (timeset, visParams) {
    var sets = visParams.timeSets;
    if (sets && sets.selected) {
      return _.isEqual(timeset, sets.selected);
    } else {
      return false;
    }
  };

  VisTimefilterHandler.prototype.remove = function (ix, visParams) {
    var avail = this.getAvailable(visParams);
    var set = avail[ix];
    if (set) {
      if (this.isSelected(set, visParams)) {
        this._clearTime();
        var sets = visParams.timeSets;
        sets.selected = null;
      }
      avail.splice(ix, 1);
    }
  };

  VisTimefilterHandler.prototype.toggleSelection = function (timeset, visParams) {
    var sets = visParams.timeSets;
    if (sets) {
      if (this.isSelected(timeset, visParams)) {
        this._clearTime();
        sets.selected = null;
      } else {
        this._setTime(timeset.from, timeset.to, timeset.interval);
        sets.selected = timeset;
      }

      this.watchCounter++; // trigger watcher
    }
  };


  /**
   * Sets the local time of this handler.
   */
  VisTimefilterHandler.prototype._toTicks = function (text) {
    if (!text) return undefined;

    if (moment.isMoment(text)) {
      return text.format();
    }
    if (_.isDate(text)) {
      return text.format();
    }

    // parse ISO format
    var m = moment(text);
    if (m.isValid()) {
      return m.format();
    }

    // parse dateMath
    m = dateMath.parse(text);
    if (m && m.isValid()) {
      return m.format();
    }

  };

  return VisTimefilterHandler;
};
