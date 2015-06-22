// hoist a set of lines in a multi-line string (maintaining their order) above a certain other line.
// takes a "body" string, a "move" array of strings, and a "marker" string, above which the files are moved
'use strict';

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function lineRegex(line) {
  return new RegExp('\\s*' + escapeRegExp(line.trim()));
}

module.exports = function (args) {
  var body = args.body,
    move = args.move,
    marker = args.marker;

  var lines = body.split('\n');



  // find the lines we want to move
  var moveLineIndexes = [];
  move.forEach(function (moveLine) {
    var i, index;
    var lineRegex = lineRegex(moveLine);
    for (i = 0; i < lines.length; i++) {
      if (lines[i].match(lineRegex)) {
        index = i;
        break;
      }
    }
    if (typeof index !== 'number') {
      throw new Error('Move line ' + moveLine.trim() + ' not found');
    }
    moveLineIndexes.push(index);
  });

  // pull all the lines out
  var hoistLines = [];
  while (moveLineIndexes.length > 0) {
    hoistLines.unshift(lines.splice(moveLineIndexes.pop(), 1)[0]);
  }

  // find the marker line
  var markerRegex = lineRegex(marker);
  var markerLineIndex;
  var i;
  for (i = 0; i < lines.length; i++) {
    if (lines[i].match(markerRegex)) {
      markerLineIndex = i;
      break;
    }
  }
  if (typeof markerLineIndex !== 'number') {
    throw new Error('Marker not found');
  }

  // put all the lines back in
  lines.splice(markerLineIndex, 0, hoistLines);

  return lines.join('\n');
};
