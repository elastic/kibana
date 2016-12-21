import _ from 'lodash';
import numeral from 'numeral';
import React, { Component } from 'react';
import $ from './flot';
import getLastValue from './get_last_value';
import Sparkline from './sparkline';
class SeriesSparkline extends Sparkline {

  constructor(props) {
    super(props);
  }

  calculateData(data) {
    return _(data)
    .map((set) => {
      if (_.isPlainObject(set)) {
        return set;
      }
      return {
        color: '#990000',
        data: set
      };
    })
    .reverse()
    .value();
  }

}

export default SeriesSparkline;

