define(function (require) {
  var _ = require('lodash');
  var d3 = require('d3');

  /* Returns an array of usedColors. The length of usedColors
    is trimmed or extended with generated colors to match length of colDom.
    */

  // 72 seed colors
  var seedColors = [
    '#57c17b', '#006e8a', '#6f87d8', '#663db8', '#bc52bc', '#9e3533', '#daa05d', '#967b17',
    '#a0caae', '#73a4b0', '#acb5d8', '#9b8bbb', '#c19fc1', '#b88484', '#e0cbb2', '#bfb282',
    '#336c46', '#00455c', '#394e93', '#422c6d', '#783678', '#6a2424', '#936734', '#60521f',
    '#b3d5bf', '#85adb7', '#bdc5e0', '#aa9dc3', '#c9acc9', '#c39898', '#e8d7c5', '#cbc09a',
    '#2c593b', '#003252', '#34457f', '#352456', '#673267', '#591d1d', '#7f592f', '#443b17',
    '#c7e0cf', '#a8c5cc', '#d2d7ea', '#c2b9d4', '#dbc7db', '#d5b9b9', '#f2e9de', '#d9d1b5',
    '#254b32', '#002c47', '#2b3969', '#30214f', '#562956', '#491818', '#654625', '#393114',
    '#dbebe0', '#bcd2d7', '#d0d6eb', '#cdc4de', '#e8d9e8', '#e0cccc', '#f5eee5', '#e4dec9',
    '#20412b', '#001f33', '#232f57', '#281b41', '#482348', '#3e1414', '#563c20', '#2e2810'
  ];

  var usedColors = [];

  return function (colDom) {
    // check if more colors needed
    var dif = colDom - seedColors.length;
    if (dif > 0) {
      // generate more colors
      usedColors = _.clone(seedColors);
      for (var newcol, i = 0; i < dif; i++) {
        newcol = d3.rgb(usedColors[i])
          .darker(1.3)
          .toString();
        usedColors.push(newcol);
      }
    } else {
      // trim to length of colDomain labels
      usedColors = _.first(seedColors, colDom);
    }
    return usedColors;
  };

});