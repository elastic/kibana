/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type jQuery from 'jquery';

/**
 * jQuery with Flot's `$.plot` API after the package plugins have registered.
 */
export type FlotJQuery = typeof jQuery & {
  plot: jquery.flot.plotStatic;
};

export type FlotPlot = jquery.flot.plot;
export type FlotPlotStatic = jquery.flot.plotStatic;
export type FlotDataSeries = jquery.flot.dataSeries;
export type FlotPlotOptions = jquery.flot.plotOptions;
export type FlotPlugin = jquery.flot.plugin;

declare const $: FlotJQuery;
export default $;
