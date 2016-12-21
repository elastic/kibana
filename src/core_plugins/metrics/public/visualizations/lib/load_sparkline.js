import _ from 'lodash';
import numeral from 'numeral';
import React, { Component } from 'react';
import $ from './flot';
import getLastValue from './get_last_value';
import Sparkline from './sparkline';
class LoadSparkline extends Sparkline {

  constructor(props) {
    super(props);
    this.opts.yaxis.max = _(props.metrics).map(row => row[1]).max() + 1;
    this.opts.yaxis.min = 0;
  }

}

export default LoadSparkline;
